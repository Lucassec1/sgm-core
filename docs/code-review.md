# Code review — SGM Core

Revisão gerada por Claude a partir do repositório público [`Lucassec1/sgm-core`](https://github.com/Lucassec1/sgm-core) (branch `main`).
Versão navegável (com destaque de severidade e blocos de código): https://claude.ai/code/artifact/a307b0be-e6a0-4ccd-98ac-91f01fd5396e

Data: 04/09/2026
Revalidado e corrigido: 07/09/2026 — cada item abaixo ganhou uma linha **Status** com o que foi feito.

## Veredito

Base sólida pro estágio em que está: as regras de negócio mais arriscadas (R1-R9) estão implementadas com
rastreabilidade clara e testadas de propósito, não por acaso.

**Rodada de ajustes (07/09/2026):** os 7 riscos numerados foram tratados. Corrigidos: doc do `CLAUDE.md`
+ comentário do `schema.prisma` (Alta 1), todas as escritas compostas agora em `prisma.$transaction`
(Alta 2), CORS com allow-list por env (Alta 3), checagem+escrita das regras R1-R4 numa transação
`Serializable` com retry (Média 4), harness de teste do client (Vitest + Testing Library) com job no CI
(Média 5), `@Max(100)` nos 3 DTOs de paginação (Média 6). Parcial: `npm audit` (Média 7) — aplicado o
`npm audit fix` não-breaking (client 3→2 avisos; server segue em 26, todo o resto pede major). O checklist
de 5 itens de hardening e o isolamento por paróquia seguem como "decidir depois", sem mudança.

---

## Pontos fortes

1. **Rastreabilidade regra → código.** Cada guarda de negócio em `alocacoes.service.ts` cita o número da
   regra e aponta pra `docs/regras-imutaveis.md` — `verificarBloqueioRecusa` (R1),
   `verificarRepeticaoEquipe` (R2), `verificarCoordenacao` (R3), `verificarBloqueioConvite` (R4).

2. **Teste onde o risco realmente mora.** `alocacoes.service.spec.ts`, `montagens.service.spec.ts` e
   `lista-substituicao.service.spec.ts` cobrem R1-R9 com Prisma mockado, não só o caminho feliz do CRUD.
   Ambos os jobs da CI (`server` e `client`) rodam `npm test`.

3. **Schema Prisma bem pensado.** `@@unique([paroquiaId, numeroEncontro])` garante no banco — não só na
   service — que o número do encontro é sequencial por paróquia. O par
   `@@unique([montagemId, fichaId])` / `@@unique([montagemId, fichaCasalId])` em `ListaSubstituicao` resolve
   corretamente o padrão de FK opcional par-a-par, e todo FK usado em filtro tem índice.

4. **A fronteira do que falta é explícita, não silenciosa.** `JwtAuthGuard`, `ParoquiaScopeGuard` e
   `AuthService` são stubs assumidos como tal, com `// TODO` apontando pra seção exata da doc em cada
   controller que vai precisar deles.

5. **Client compila limpo, de ponta a ponta.** `tsc --noEmit`, `next lint` e `next build` rodaram sem erro
   nem warning, com as 10 rotas geradas.

6. **Seed de desenvolvimento não usa dado real de pessoa.** `prisma/seed.ts` monta nomes/telefones/endereços
   fake combinando listas por índice — não é uma exportação de dados reais de membros colada no repositório.

---

## Riscos — prioridade alta

### 1. CLAUDE.md descreve um módulo que não existe mais
**Onde:** `CLAUDE.md:39`, `server/prisma/schema.prisma:2`

`CLAUDE.md` diz "*Módulo Montagem: não iniciado — nem schema, nem backend, nem frontend*". Mas o módulo tem
schema completo (Equipe, Cargo, Montagem, VagaMontagem, Alocacao, ListaSubstituicao, LogAtividade),
7 migrations, 4 controllers, 5 services implementando R1-R9 e 716 linhas de teste. O mesmo tipo de defasagem
aparece no topo do `schema.prisma` ("Ainda sem models") — comentário do primeiro commit, nunca atualizado.

**Por que importa:** esse é o arquivo que uma sessão de Claude Code lê antes de mexer em qualquer coisa
("ler sempre antes de..."). Se alguém confiar nele, o risco é replanejar ou re-scaffoldar um módulo que já
está pronto e testado.

**Status (07/09/2026): corrigido.** `CLAUDE.md` já vinha com a seção "Estado atual" correta ("Módulo
Montagem: quase completo"). Nesta rodada o comentário do topo de `server/prisma/schema.prisma` foi trocado
por uma linha que descreve o schema real e aponta pras Services / `docs/regras-imutaveis.md`.

### 2. Nenhuma escrita composta usa transação
**Onde:** `grep "$transaction"` → 0 ocorrências no projeto inteiro

Em `MontagensService.create()`: cria a Montagem, depois `vagaMontagem.createMany`, depois o log de
atividade — se o `createMany` falhar, sobra uma Montagem sem nenhuma vaga. Em
`AlocacoesService.create/update/remove` e `ListaSubstituicaoService.create/remove`, a escrita principal e o
`logAtividade.registrar()` (R9) também são dois awaits independentes — se o segundo falhar depois do
primeiro já ter comitado, a ação fica sem rastro de auditoria.

**Sugestão:** envolver cada operação composta num `prisma.$transaction(async (tx) => { ... })`.

**Status (07/09/2026): corrigido.** Agora em `prisma.$transaction`: `MontagensService.create` e `.update`,
`AlocacoesService.create` / `.update` / `.remove`, `ListaSubstituicaoService.create` / `.remove`. O
`LogAtividadeService.registrar` ganhou um parâmetro `tx` opcional (default `this.prisma`) pra gravar o log
(R9) dentro da mesma transação da escrita que ele audita. Specs ajustadas com um `$transaction` passthrough
no mock do Prisma; 44 testes do server passando.

### 3. CORS liberado para qualquer origem
**Onde:** `server/src/main.ts:15`

`app.enableCors()` é chamado sem opções, o que no Nest reflete qualquer `Origin` recebido. Não causa
problema hoje (tudo no mesmo `docker-compose`), mas vale restringir a uma allow-list vinda de env var antes
do client ser servido de um domínio real.

**Status (07/09/2026): corrigido.** `main.ts` agora lê `CORS_ORIGINS` (lista separada por vírgula) e passa
`{ origin, credentials: true }` pro `enableCors`. Sem a env, mantém o comportamento antigo (reflete qualquer
origem) — cômodo pra dev local; `CORS_ORIGINS` documentado em `server/.env.example` como obrigatório assim
que o client for pra um domínio real.

---

## Riscos — prioridade média

### 4. Corrida entre ler e decidir nas regras R1-R3
**Onde:** `server/src/modules/montagem/alocacoes.service.ts` — `verificarRepeticaoEquipe` / `verificarCoordenacao`

`AlocacoesService.create()` faz `SELECT`s de checagem e só depois o `INSERT` — sem lock de linha nem
constraint no banco reforçando o "máximo 3x" (R2). Duas chamadas simultâneas pra mesma pessoa+equipe podem
ambas ler `vezesServidas = 2` e ambas inserir. Baixo risco hoje (poucos usuários simultâneos); vale um índice
parcial ou transação `serializable` antes de contar com edição colaborativa de verdade.

**Status (07/09/2026): corrigido.** `AlocacoesService.create` agora roda as checagens R1-R4 **e** a escrita
dentro de um único `prisma.$transaction(..., { isolationLevel: Serializable })` — ler e gravar enxergam o
mesmo estado, então duas chamadas simultâneas pra mesma pessoa+equipe não furam mais o "máximo 3x" (R2).
Os métodos privados `verificar*` e `getVagaOuFalha` passaram a receber o client transacional. Um helper
`comRetrySerializacao` repete a operação até 3x quando o Postgres aborta por conflito de serialização
(P2034). Não foi adicionada constraint no schema — a transação Serializable cobre o caso.

### 5. Zero teste automatizado no client
**Onde:** `client/package.json` (sem test runner), `.github/workflows/ci.yml` (job "client" só lint+typecheck+build)

Convive com formulários grandes e validação condicional (`ficha-form.tsx`, `ficha-casal-form.tsx`) e com o
fluxo de montagem, onde as regras R1-R9 chegam pro usuário (ex.: tratar o `409` de R2 pra abrir o Alert
Dialog de confirmação). Hoje isso só é coberto manualmente.

**Status (07/09/2026): corrigido (base montada).** Adicionado Vitest + Testing Library ao client
(`vitest.config.mts`, `vitest.setup.tsx` com mock de `next/image`), script `npm test` e step `Test` no job
`client` da CI. Primeiros testes: `lib/utils.test.ts` (`cn`, `nullsToUndefined`) e
`components/equipes/equipe-icon.test.tsx` (render, alt/aria, slug inválido) — 6 testes passando. Falta
cobrir os fluxos caros que a revisão citou (formulários, tratamento do `409` de R2); a infra pra isso já
está no lugar.

### 6. Paginação sem limite máximo
**Onde:** `fichas/dto/query-fichas.dto.ts:30`, `fichas-casais/dto/query-fichas-casais.dto.ts:25`,
`montagem/dto/query-montagens.dto.ts:22`

Os três DTOs de listagem têm `@Min(1)` em `pageSize`, mas nenhum `@Max(...)`. `GET /fichas?...&pageSize=999999`
passa direto pela validação. Fácil de fechar agora (`@Max(100)`) antes que o volume cresça.

**Status (07/09/2026): corrigido.** `@Max(100)` adicionado em `pageSize` nos três DTOs
(`query-fichas.dto.ts`, `query-fichas-casais.dto.ts`, `query-montagens.dto.ts`).

### 7. Dependências com vulnerabilidades conhecidas
**Onde:** `npm audit` — server: 14 (7 altas) · client: 3 (3 altas)

Server: `multer` (via `@nestjs/platform-express`) com avisos de DoS; `mysql2` instalado transitivamente
(não usado — o projeto é Postgres puro) com falha de downgrade de auth. Client: `next` traz `postcss` e
`sharp` com CVEs de XSS/path traversal e falhas de `libvips`. `npm audit fix` resolve o `qs` (moderado) sem
quebrar nada; o resto pede upgrade maior (`@nestjs/platform-express` 12, `next` 16) — planejar como tarefa
própria.

**Status (07/09/2026): parcial.** Rodado `npm audit fix` (não-breaking) nos dois pacotes. Client: **3 → 2**
avisos (`sharp` resolvido; sobra `postcss` via `next`, que só sai com `next@16`). Server: segue em **26**
avisos — `npm audit fix` não mexeu em nada porque todo o restante (incl. `multer`, `mysql2`, `webpack`)
exige major (`@nestjs/platform-express` 12, `@nestjs/cli` 12). `npm audit fix` bumpou o Prisma dentro do
range (`7.9.1` → `7.10.0`, sem quebra). **Pendente como tarefa própria:** upgrade de `next` pra 16 e dos
pacotes NestJS majores.

---

## Parece gap, mas é decisão já registrada

**Isolamento por paróquia ainda não é real.** `ParoquiaScopeGuard.canActivate()` retorna `true` (stub) e
`paroquiaId` viaja como campo comum no body/query, vindo direto de `PAROQUIA_ID_PROVISORIA` no client
(`client/lib/constants.ts:4`). O próprio `CLAUDE.md` já marca isso como decisão consciente pro estágio
atual. Só registrando pra quando o Auth entrar: hoje nada impede uma requisição malformada de ler/escrever
fichas de outra paróquia via `paroquiaId` arbitrário no payload.

**Status (07/09/2026): inalterado, como esperado.** `common/guards/paroquia-scope.guard.ts:12` continua
`return true` e `client/lib/constants.ts:4` continua exportando `PAROQUIA_ID_PROVISORIA`. Segue coerente
com a decisão registrada no `CLAUDE.md`.

---

## Checklist — antes de sair do ambiente controlado

Nenhum destes trava o protótipo de uma paróquia hoje — reunidos aqui pra decidir deliberadamente "ainda não"
em vez de descobrir faltando em produção.

- [ ] **Cabeçalhos de segurança (helmet)** — nenhum middleware de segurança HTTP registrado em `main.ts`.
- [ ] **Rate limiting** — nenhum `ThrottlerModule` ou equivalente.
- [ ] **Filtro de exceção global** — erros do Prisma que escaparem de um `try/catch` local vazam a mensagem
      interna direto pro client.
- [ ] **Logger estruturado** — nenhum uso de `console.log` nem do `Logger` do Nest; hoje não existe log
      operacional pra debugar um erro em produção depois do fato.
- [ ] **Contrato de API (Swagger/OpenAPI)** — nenhum `@nestjs/swagger` configurado.

**Status (07/09/2026): os 5 itens seguem abertos.** `server/package.json` não ganhou `helmet`,
`@nestjs/throttler` nem `@nestjs/swagger`; `main.ts` não registra middleware de segurança nem filtro de
exceção global (`src/common/interceptors/` está vazio); nenhum uso de `Logger` do Nest ou `console.` no
`src/`.

---

## Metodologia

**O que revisei:** leitura estática de todo o `server/` e `client/` (controllers, services, guards, schema,
DTOs, testes, CI, docker-compose, docs/, seeds), mais execução de `tsc --noEmit`, `next lint` e `next build`
no client, e `npm audit` nos dois pacotes.

**O que não rodei:** testes, typecheck e build do `server/`. O sandbox desta sessão bloqueou o download do
engine binário do Prisma (403 em `binaries.prisma.sh`), então não deu pra gerar o Prisma Client — toda a
leitura do lado servidor é estática, não executada.

**Revalidação + ajustes (07/09/2026):** reconferência item a item contra o HEAD atual
(`feat/montagem-convites-quadrantes`) e correção dos 7 riscos numerados (ver linha **Status** de cada um).
Verificação após os ajustes: server — `tsc --noEmit`, `eslint`, `npm test` (44 testes) e `prisma generate`
OK; client — `tsc --noEmit`, `next lint`, `next build` e `npm test` (6 testes) OK. `npm audit` rerodado nos
dois pacotes. O checklist de hardening e o isolamento por paróquia não foram tocados — seguem como decisão
"depois".
