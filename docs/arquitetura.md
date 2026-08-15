# SGM Core — Arquitetura

> Camada técnica, complementar aos outros 4 documentos (produto/UX/regras). Decisões pensadas para: um mantenedor só, uso interno (13 paróquias no máximo), sem necessidade de escala massiva — priorizando simplicidade e aprendizado sobre sofisticação.

---

## 1. Decisões gerais

- **Monorepo** (`/server` + `/client` no mesmo repositório) — um mantenedor só se beneficia de PRs que mexem nos dois lados junto, e simplifica o CI.
- **Monólito modular** no backend, não microsserviços — não há escala nem times separados que justifiquem a complexidade operacional extra.
- **REST**, não GraphQL — telas relativamente previsíveis, sem necessidade de flexibilidade de query do cliente.
- **Multi-tenancy:** banco compartilhado com `paroquia_id` em toda tabela relevante, não banco por paróquia — mais simples de operar sozinho, com o isolamento (regra R7) garantido centralizadamente (ver seção 3).
- **Auth:** JWT + login por paróquia (equipe dirigente) — sem necessidade de OAuth externo, é um sistema interno e fechado.

## 2. Backend (NestJS)

- **Padrão:** Controller → Service → Repository. A lógica de negócio (regras R1-R9) vive na **Service**, nunca no Controller nem espalhada em queries soltas.
- **ORM:** Prisma — curva de aprendizado mais suave que TypeORM, schema declarativo, migrations automáticas.
- **Validação:** DTOs com `class-validator`.
- **Estrutura:**

```
/server/src
  /modules
    /fichas
      fichas.controller.ts
      fichas.service.ts
      fichas.module.ts
      /dto
    /montagem
    /auth
    /paroquias
  /common
    /guards          ← JwtAuthGuard, ParoquiaScopeGuard
    /interceptors
  /prisma
    schema.prisma
  app.module.ts
```

## 3. Isolamento por paróquia (R7)

Implementado como **guard/interceptor central**, não filtro manual espalhado pelas queries — o `paroquia_id` do usuário autenticado é injetado automaticamente em toda query relevante. Um único ponto de garantia é mais seguro que confiar em lembrar o filtro em cada service.

## 4. Frontend (Next.js)

- **App Router**, estrutura por feature (espelhando os módulos do backend).
- **Estado do servidor:** TanStack Query (React Query) — cache, refetch, e combina bem com o padrão de auto-save definido no `ux-e-fluxos.md` (mutation + invalidation).
- **Formulários:** react-hook-form + zod — padrão esperado pelos componentes de formulário do shadcn.
- **Estrutura:**

```
/client/app
  /fichas
    page.tsx
    /[id]/page.tsx
  /montagem
  /login
/client/components
  /ui                ← componentes shadcn
  /fichas
  /montagem
/client/lib
  api-client.ts
  /hooks             ← um hook por domínio (useFichas, useMontagem...)
```

## 5. Testes

- Unitários na **Service**, priorizando as regras de negócio (R1-R9) — são o ponto mais caro de errar.
- E2E nos fluxos críticos (Fluxo de Cadastro, Fluxo de Montagem, definidos no `ux-e-fluxos.md`).
- Seed de dados fake (não fichas reais) para testar a lógica de montagem antes de importar dados reais.

## 6. CI/CD

- GitHub Actions: lint + testes + build a cada push/PR (prioridade 1).
- Deploy automático para staging na main (opcional, prioridade 2).
- Deploy em produção manual, pelo menos no início.

## 7. Docker

- `docker-compose.yml` com Postgres + server + client para desenvolvimento local.
- Dockerfile simples, sem multi-stage otimizado por enquanto (evoluir se/quando for pra produção de verdade).
