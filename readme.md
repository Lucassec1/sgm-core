# SGM Core

Sistema de gestão do Segue-me (Fichas + Montagem) — diocese de Crato.

Monorepo: NestJS (`/server`) · Next.js (`/client`) · PostgreSQL · Docker.

## Como rodar

```bash
docker-compose up
```

Sobe Postgres (`:5432`), a API (`:3001`) e o client (`:3000`).

Primeira vez — aplicar migrations e popular com dados de teste (de dentro de `/server`):

```bash
npx prisma migrate dev
npm run prisma:seed
```

O seed acima já cria uma credencial de paróquia de teste (`paroquia-dev` / `paroquia-dev-123`,
ver `server/prisma/seed.ts`). Fichas/Montagem/Conselho exigem login (`POST /auth/login`) — o
guard global bloqueia todo o resto.

### Bootstrap da primeira conta de Conselho

Não existe cadastro público de conta — o Conselho é quem cria/reseta credenciais de paróquia
(`POST /paroquias`, `PATCH /paroquias/:id/credenciais`), mas a primeira conta de Conselho
precisa nascer de outro jeito. Rode uma vez, de dentro de `/server` (idempotente por `login`,
seguro de rodar em produção — não mexe em Ficha/FichaCasal/Montagem):

```bash
SEED_CONSELHO_LOGIN=... SEED_CONSELHO_SENHA='...' SEED_CONSELHO_NOME='...' \
  npm run prisma:seed:bootstrap-conselho
```

Depois disso, use essa conta pra criar as demais (Conselho e credenciais de paróquia) direto
pela interface.

## Documentação

Toda a documentação de produto, regras de negócio e decisões técnicas está em [`docs/`](./docs)
— ver [`CLAUDE.md`](./CLAUDE.md) para o índice completo.
