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
  client), Sidebar de navegação, dashboard. Falta upload real de foto (hoje é só campo de
  URL) e Situação/histórico de equipes (fica pro módulo Montagem).
- **Módulo Montagem: não iniciado** — nem schema, nem backend, nem frontend.
- **Auth: stub** — `AuthController`/`AuthService`/`JwtAuthGuard` existem como esqueleto, sem
  lógica real. `/login` no client é uma página vazia.
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
