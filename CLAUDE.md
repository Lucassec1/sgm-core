# SGM Core

Sistema de gestão do Segue-me (Fichas + Montagem), diocese de Crato.

Stack: Next.js · NestJS · PostgreSQL · Docker

## Como rodar

```
docker-compose up
```

Sobe Postgres + server (`:3001`) + client (`:3000`). Rodar migrations/seed de dentro de `/server`:
`npx prisma migrate dev` e `npm run prisma:seed` (popula fichas + casais fake pra testar).

## Documentação

- `docs/requisitos.md` — o que o sistema faz (requisitos funcionais e não funcionais)
- `docs/regras-imutaveis.md` — regras de negócio do Segue-me (R1 a R9). **Ler sempre** antes de mexer em qualquer lógica do módulo Montagem — nenhuma dessas regras pode ser violada, mesmo sem pedido explícito.
- `docs/ux-e-fluxos.md` — fluxos de usuário e decisões de UX. Ler antes de criar ou alterar qualquer tela.
- `docs/design-system.md` — tokens visuais e mapa de componentes shadcn. Ler antes de estilizar algo novo.
- `docs/arquitetura.md` — decisões técnicas (backend, frontend, multi-tenancy, testes, CI/CD). **Ler sempre** antes de criar estrutura de pastas, escolher biblioteca nova ou decidir padrão de código.
- `docs/deploy.md` — como a produção está montada (Neon, S3, Render, Vercel), variáveis, migrations e checklist pós-deploy. Ler antes de mexer em deploy, env vars ou schema em produção.
- `docs/sucessao.md` — guia em português simples pra quem não é técnico (e se o site cair, contas e donos, o que não mexer).
- `docs/producao.md` — avaliação do que falta pra ser um produto de verdade, com status por item.
- `docs/historico/` — documentos datados que ficam só de registro (code review de 04/09, propostas de evolução); não são fonte de verdade.

## Estrutura do projeto

```
/server   — API NestJS
/client   — Next.js
/docs     — documentação de produto (acima)
```

`server/CLAUDE.md` e `client/CLAUDE.md` guardam as convenções específicas de cada lado (estrutura de módulos/pastas, como criar endpoint, como usar os componentes do design system etc.) — leia o que for relevante pra pasta em que estiver trabalhando.

## Estado atual

- **Módulo Fichas: pronto** — CRUD completo de Ficha do Jovem e Ficha do Casal (server +
  client), Sidebar de navegação, dashboard, página de detalhe com header (foto/nome/situação),
  histórico de equipes e dados cadastrais em seções empilhadas. Upload real de foto 3x4
  (JPEG/PNG/WEBP, até 5MB) — binário no S3 (bucket privado, ver
  `server/src/common/uploads/s3-storage.ts`), não filesystem (hospedagem com disco efêmero
  perderia o arquivo a cada restart/deploy). Upload em lote (pasta inteira + tela de
  conferência, vinculando pelo nome do arquivo) ainda não existe.
- **Módulo Montagem: quase completo** — schema, backend (montagens, alocações, equipes,
  lista de substituição, log de atividade, quadrantes) com regras R1–R6 e R9 aplicadas e
  testadas (specs em `server/src/modules/montagem/*.spec.ts`); frontend com quadro das 16
  equipes, drawer por equipe, lista completa, aba Convites (status + saídas/motivos + log),
  aba Substituições, aba Quadrantes (upload/download de PDF), criar/editar/finalizar
  montagem, ícones das equipes (`EquipeIcon`).
  **Falta:** exportação continua só CSV simples (fichas + montagem, sem o .xlsx completo
  planejado originalmente — ver `docs/producao.md`, item 4). Quadrantes: binário no S3, mesmo
  padrão das fotos de Ficha.
- **Auth: pronto** — login JWT (cookie httpOnly) por credencial de paróquia (compartilhada,
  não individual), guard global exigindo sessão em quase tudo, isolamento real entre paróquias
  (R7) e Conselho implementado de verdade (R8) — ver seção "Isolamento por paróquia" abaixo e
  `server/CLAUDE.md` pro padrão de guard/rota. `paroquiaId` não é mais aceito de nenhum
  endpoint vindo do client — sempre vem do token.
- **Produção**: Neon (Postgres), S3 (fotos/quadrantes), Render (server) e Vercel (client) — deploy feito em
  21/09/2026; validação em produção e documentos de operação em `docs/deploy.md` e `docs/sucessao.md`.
- **CI**: GitHub Actions rodando lint + typecheck + testes + build (server e client) em push/PR pra `main`.
  E2E (Playwright, `npm run test:e2e`) roda só local.

## Isolamento por paróquia

**Decisão revertida em 15/09/2026** (a decisão anterior de adiar multi-paróquia/Conselho até o
protótipo validar foi substituída por uma decisão explícita do Lucas de implementar R7/R8 de
verdade agora — ver `docs/producao.md`, bloqueador #3). R7 (isolamento real entre paróquias) e
R8 (Conselho: leitura cross-paróquia da Montagem, observações, gestão de credenciais de
paróquia) estão implementados e testados no backend.

`paroquia_id` chega em toda query via `request.user.paroquiaId` (do JWT), nunca mais do client
— `ParoquiaScopeGuard`/`MontagemScopeGuard` fazem a garantia central. O client (login,
proteção de rota, área do Conselho) está sendo implementado/validado nesta mesma etapa.
