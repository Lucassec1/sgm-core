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

## Estrutura do projeto

```
/server   — API NestJS
/client   — Next.js
/docs     — documentação de produto (acima)
```

`server/CLAUDE.md` e `client/CLAUDE.md` guardam as convenções específicas de cada lado (estrutura de módulos/pastas, como criar endpoint, como usar os componentes do design system etc.) — leia o que for relevante pra pasta em que estiver trabalhando.

## Estado atual

- **Módulo Fichas: pronto** — CRUD completo de Ficha do Jovem e Ficha do Casal (server +
  client), Sidebar de navegação, dashboard, página de detalhe com header (foto/nome/situação)
  + histórico de equipes + dados cadastrais em seções empilhadas. Falta upload real de foto
  (hoje é só campo de URL).
- **Módulo Montagem: quase completo** — schema, backend (montagens, alocações, equipes,
  lista de substituição, log de atividade, quadrantes) com regras R1–R6 e R9 aplicadas e
  testadas (specs em `server/src/modules/montagem/*.spec.ts`); frontend com quadro das 16
  equipes, drawer por equipe, lista completa, aba Convites (status + saídas/motivos + log),
  aba Substituições, aba Quadrantes (upload/download de PDF), criar/editar/finalizar
  montagem, ícones das equipes (`EquipeIcon`).
  **Falta:** exportar .xlsx (aba Exportação = "em breve"); R7/R8 seguem adiados (ver seção
  "Isolamento por paróquia"). Quadrantes: binário no filesystem do server
  (`UPLOADS_DIR`, fallback `server/uploads/`, gitignored) — pra produção apontar num volume.
- **Auth: stub** — `AuthController`/`AuthService`/`JwtAuthGuard` existem como esqueleto, sem
  lógica real. `/login` no client é uma página vazia. Enquanto isso, o campo `usuario` do log
  de atividade (R9) e o `paroquiaId` vêm do client provisoriamente.
- **CI**: GitHub Actions rodando lint + typecheck + build (server e client) em push/PR pra `main`.

## Isolamento por paróquia

**Decisão atual (conversa com o Lucas): manter o sistema numa paróquia só por enquanto.**
Multi-paróquia + Conselho (ver `docs/requisitos.md`, seção 5-6) é a expansão planejada pra
depois que o protótipo da paróquia do Lucas estiver validado — não é prioridade agora.

Por isso, hoje: `paroquia_id` já existe em toda tabela relevante (Ficha, FichaCasal) e é
passado manualmente pelo client (`PAROQUIA_ID_PROVISORIA`), mas o `ParoquiaScopeGuard` é só
um stub (`return true`) — não há isolamento real aplicado ainda. **Não é uma falha a ser
corrigida com urgência**: só passa a importar quando o Auth entrar de verdade e o sistema for
expandido pra mais de uma paróquia. Não tratar isso como bloqueador do módulo Montagem.
