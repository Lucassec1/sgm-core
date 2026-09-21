# SGM Core

Sistema de gestão do Segue-me (Fichas + Montagem) — diocese de Crato.

Monorepo: NestJS 11 (`/server`) · Next.js 16 (`/client`) · PostgreSQL · Docker.

## Estado atual

- **Fichas** (jovem e casal, com foto 3x4), **Montagem** (16 equipes, convites, substituições,
  quadrantes, log de atividade), **login por paróquia** e **Conselho** estão implementados.
- **Ainda falta:** exportação `.xlsx` completa (hoje só CSV), upload de fotos em lote e a
  validação final do login/Conselho no client.
- Detalhes, pendências e prioridades: [`docs/producao.md`](./docs/producao.md) e o "Estado
  atual" do [`CLAUDE.md`](./CLAUDE.md).

## Como está em produção

| Peça                | Onde                              |
| ------------------- | --------------------------------- |
| Banco (Postgres 16) | Neon (backup automático incluído) |
| Fotos e Quadrantes  | AWS S3 (bucket privado)           |
| API (`/server`)     | Render                            |
| Client (`/client`)  | Vercel                            |

Não há `render.yaml` nem `vercel.json` no repositório: a configuração de deploy vive só nos
painéis do Render e da Vercel. As variáveis de ambiente de cada lado estão na seção abaixo —
são as que precisam existir lá.

Render e Vercel são domínios diferentes, então em produção o cookie de sessão sai como
`SameSite=None` e o `CORS_ORIGINS` do server precisa listar a URL exata do client.

## Como rodar localmente

```bash
docker-compose up
```

Sobe Postgres (`:5432`), a API (`:3001`) e o client (`:3000`).

Primeira vez — aplicar migrations e popular com dados de teste (de dentro de `/server`):

```bash
npm run prisma:generate
npx prisma migrate dev
npm run prisma:seed
```

O seed cria uma credencial de paróquia de teste (`paroquia-dev` / `paroquia-dev-123`, ver
`server/prisma/seed.ts`). Fichas, Montagem e Conselho exigem login (`POST /auth/login`) — o
guard global bloqueia todo o resto. A documentação da API (Swagger) fica em `/docs` no server, **só fora de produção** (lá responde 404).

> **Nunca rode `prisma:seed` no banco de produção** — ele cria fichas e casais falsos. Em
> produção só o bootstrap do Conselho (abaixo) é seguro.

### Sem Docker

Precisa de um Postgres acessível, `server/.env` e `client/.env` (copie dos `.env.example`).

```bash
cd server && npm ci && npm run prisma:generate && npm run start:dev   # :3001
cd client && npm ci && npm run dev                                    # :3000
```

Versões de Node: server 20+, client 22+ (o CI usa 20 e 24).

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

## Variáveis de ambiente

**Server** (`server/.env`, modelo em `server/.env.example`):

| Variável                                     | Obrigatória | Para quê                                                                       |
| -------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                               | sim         | Conexão Postgres (em produção, a do Neon)                                      |
| `JWT_SECRET`                                 | sim         | Assinatura do token de sessão — em produção, valor único e forte               |
| `JWT_EXPIRES_IN`                             | não         | Duração da sessão (padrão `12h`)                                               |
| `PORT`                                       | não         | Porta da API (padrão `3001`)                                                   |
| `CORS_ORIGINS`                               | produção    | URLs permitidas, separadas por vírgula. Vazio reflete qualquer origem (só dev) |
| `LOG_LEVEL`                                  | não         | Nível do logger (pino)                                                         |
| `AWS_REGION`, `S3_BUCKET_NAME`               | sim         | Bucket de fotos e Quadrantes                                                   |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | sim         | Credenciais IAM com acesso ao bucket                                           |
| `SENTRY_DSN`                                 | não         | Rastreamento de erro; sem ela o Sentry fica inativo                            |

**Client** (`client/.env`, modelo em `client/.env.example`):

| Variável                 | Obrigatória | Para quê                                            |
| ------------------------ | ----------- | --------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`    | sim         | URL da API (em produção, a do Render)               |
| `NEXT_PUBLIC_SENTRY_DSN` | não         | Rastreamento de erro; sem ela o Sentry fica inativo |

As migrations precisam ser aplicadas no banco de produção a cada mudança de schema
(`npx prisma migrate deploy`, de dentro de `/server`, com a `DATABASE_URL` de produção).

## Testes e qualidade

| O quê                     | Comando                             | Onde     |
| ------------------------- | ----------------------------------- | -------- |
| Testes do server (Jest)   | `npm test`                          | `server` |
| Testes do client (Vitest) | `npm test`                          | `client` |
| E2E (Playwright)          | `npm run test:e2e`                  | raiz     |
| Lint / typecheck          | `npm run lint` · `npx tsc --noEmit` | ambos    |
| Formatação                | `npm run format`                    | raiz     |

- O **E2E** sobe server e client de verdade, num banco isolado (`sgm_core_test`) e em portas
  próprias (`:3011` e `:3010`), sem tocar nos dados de dev. Cobre o cadastro de ficha e a
  montagem ponta a ponta.
- O **CI** (GitHub Actions) roda lint, typecheck, testes e build de server e client em todo
  push/PR pra `main`.
- Um hook do Husky (`lint-staged` + Prettier) formata os arquivos a cada commit.

## Armadilhas conhecidas

- **`npm ci` no server não gera o Prisma Client.** Sem rodar `npm run prisma:generate`, o build
  falha com dezenas de erros de tipo (`RoleUsuario`, `PrismaService`...) — não é bug do código.
- **O E2E não sobe se já houver um `next dev` rodando neste projeto.** O Next 16 trava o
  diretório `.next/dev` (`Another next dev server is already running`). Pare o `next dev` antes
  de rodar `npm run test:e2e`.
- **Mudou dependência do client? Teste o `npm ci` no Linux.** O npm no macOS pode omitir do
  lockfile pacotes que só o Linux instala (já aconteceu com `@emnapi/*`), e o CI falha com
  `Missing: ... from lock file` mesmo com tudo passando local. Confira num container:
  `docker run --rm --platform linux/amd64 -v "$PWD":/w -w /w/client node:24 npm ci`.
- **Depois de subir versão do Nest/Next, reconstrua o container:** `docker-compose up --build`.
- **`next dev` reescreve `next-env.d.ts`** a cada execução — não commite essa mudança.

## Documentação

O índice completo, com a ordem de leitura para quem vai programar, está no
[`CLAUDE.md`](./CLAUDE.md). Tudo fica em [`docs/`](./docs):

| Documento                                                     | O que é                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`requisitos.md`](./docs/requisitos.md)                       | O que o sistema faz (requisitos funcionais e não funcionais)     |
| [`regras-imutaveis.md`](./docs/regras-imutaveis.md)           | Regras de negócio do Segue-me (R1–R9) — nunca podem ser violadas |
| [`ux-e-fluxos.md`](./docs/ux-e-fluxos.md)                     | Fluxos de usuário e decisões de UX                               |
| [`design-system.md`](./docs/design-system.md)                 | Tokens visuais e mapa de componentes shadcn                      |
| [`arquitetura.md`](./docs/arquitetura.md)                     | Decisões técnicas (backend, frontend, testes, CI/CD)             |
| [`producao.md`](./docs/producao.md)                           | O que falta pra ser um produto de verdade + plano de sucessão    |
| [`historico/propostas.md`](./docs/historico/propostas.md)     | Propostas de evolução (a maioria já implementada)                |
| [`historico/code-review.md`](./docs/historico/code-review.md) | Revisão de código de 04/09/2026 (histórico)                      |

`server/CLAUDE.md` e `client/CLAUDE.md` guardam as convenções de cada lado (estrutura de
módulos, como criar endpoint, como usar o design system).
