# SGM Core — Arquitetura

> Camada técnica, complementar aos outros 4 documentos (produto/UX/regras). Decisões pensadas para: um mantenedor só, uso interno (13 paróquias no máximo), sem necessidade de escala massiva — priorizando simplicidade e aprendizado sobre sofisticação.

---

## 1. Decisões gerais

- **Monorepo** (`/server` + `/client` no mesmo repositório) — um mantenedor só se beneficia de PRs que mexem nos dois lados junto, e simplifica o CI.
- **Monólito modular** no backend, não microsserviços — não há escala nem times separados que justifiquem a complexidade operacional extra.
- **REST**, não GraphQL — telas relativamente previsíveis, sem necessidade de flexibilidade de query do cliente.
- **Multi-tenancy:** banco compartilhado com `paroquia_id` em toda tabela relevante, não banco por paróquia — mais simples de operar sozinho, com o isolamento (regra R7) garantido centralizadamente (ver seção 3).
- **Auth:** JWT em cookie httpOnly + login por paróquia (credencial compartilhada da equipe dirigente) — sem necessidade de OAuth externo, é um sistema interno e fechado.

## 2. Backend (NestJS)

- **Padrão:** Controller → Service, com a Service chamando o Prisma direto (sem camada Repository — pra um mantenedor só, seria indireção sem ganho). A lógica de negócio (regras R1-R9) vive na **Service**, nunca no Controller nem espalhada em queries soltas.
- **ORM:** Prisma — curva de aprendizado mais suave que TypeORM, schema declarativo, migrations automáticas.
- **Validação:** DTOs com `class-validator`.
- **Estrutura:**

```
/server
  /prisma              ← schema.prisma, migrations e seeds
  /src
    /modules
      /auth            ← login, troca de senha
      /paroquias       ← credenciais de paróquia (Conselho)
      /conselho        ← leitura cross-paróquia + observações (R8)
      /fichas
      /fichas-casais
      /montagem        ← montagens, alocações, equipes, quadrantes, log
      /telao           ← endpoint público reduzido (modo telão)
      /health          ← GET /health (checa o Postgres de verdade)
    /common
      /guards          ← JwtAuthGuard, RolesGuard, ParoquiaScopeGuard, MontagemScopeGuard
      /uploads         ← storage de fotos e quadrantes (S3)
      /export          ← geração de CSV
      /decorators /interceptors /transformers /types /auth
    /prisma            ← PrismaModule/PrismaService
    instrument.ts      ← Sentry (inativo sem DSN)
    app.module.ts
```

## 3. Isolamento por paróquia (R7)

Implementado como **guard central** (`ParoquiaScopeGuard` e `MontagemScopeGuard`), não filtro manual espalhado pelas queries — o `paroquiaId` vem sempre do JWT (`request.user.paroquiaId`), nunca do client, e é exigido em toda query relevante. Um único ponto de garantia é mais seguro que confiar em lembrar o filtro em cada service. O Conselho (R8) é a única exceção, só pra leitura da Montagem. Padrão de guard/rota: `server/CLAUDE.md`.

## 4. Frontend (Next.js)

- **App Router**, estrutura por feature (espelhando os módulos do backend).
- **Estado do servidor:** TanStack Query (React Query) — cache, refetch, e combina bem com o padrão de auto-save definido no `ux-e-fluxos.md` (mutation + invalidation).
- **Formulários:** react-hook-form + zod — padrão esperado pelos componentes de formulário do shadcn.
- **Estrutura:**

```
/client/app
  /(app)               ← área da equipe dirigente
    /fichas  /montagem
  /(conselho)/conselho ← área do Conselho (R8)
  /(telao)             ← modo telão / impressão
  /login
/client/components
  /ui                  ← componentes shadcn
  /fichas  /montagem  /equipes
/client/lib
  api-client.ts
  auth-context.tsx
  /hooks               ← um hook por domínio (useFichas, useMontagens...)
```

## 5. Testes

- Unitários na **Service** (Jest), priorizando as regras de negócio (R1-R9) — são o ponto mais caro de errar. No client, Vitest para api-client, contexto de auth e hooks.
- E2E (Playwright, pasta `e2e/`) nos fluxos críticos: Cadastro de Ficha e Montagem, contra server+client reais e um banco isolado (`sgm_core_test`). Não roda no CI ainda — roda local com `npm run test:e2e`.
- Seed de dados fake (não fichas reais) para testar a lógica de montagem antes de importar dados reais.

## 6. CI/CD

- GitHub Actions: lint + typecheck + testes + build (server e client) a cada push/PR pra `main`.
- Deploy: Render (server) e Vercel (client) — como estão configurados, em `docs/deploy.md`.

## 7. Docker

- `docker-compose.yml` com Postgres + server + client para desenvolvimento local.
- Dockerfiles simples (dev, com `start:dev`), sem multi-stage. O compose é só pra desenvolvimento local — como a produção sobe, em `docs/deploy.md`.

## 8. Hospedagem, armazenamento e operação

- **Banco:** Postgres gerenciado no Neon (backup automático incluído pelo provedor), schema aplicado via `prisma migrate`.
- **Arquivos:** fotos 3x4 e PDFs de Quadrante vão pro **S3** (bucket privado, `server/src/common/uploads/s3-storage.ts`), não pro filesystem — hospedagem com disco efêmero perderia o arquivo a cada restart/deploy.
- **Aplicação:** server no Render, client na Vercel. Como são domínios diferentes, o cookie de sessão sai `SameSite=None` em produção e o `CORS_ORIGINS` precisa listar a URL do client.
- **Hardening e observabilidade:** Helmet, rate limiting (`@nestjs/throttler`), logger estruturado (`nestjs-pino`), `GET /health`, Sentry nos dois lados (inativo até existir DSN). O Swagger (`/docs`) só liga fora de produção.
