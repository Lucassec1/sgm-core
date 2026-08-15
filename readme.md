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

## Documentação

Toda a documentação de produto, regras de negócio e decisões técnicas está em [`docs/`](./docs)
— ver [`CLAUDE.md`](./CLAUDE.md) para o índice completo.
