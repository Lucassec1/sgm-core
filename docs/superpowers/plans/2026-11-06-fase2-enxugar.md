# Fase 2 — Enxugar: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apagar branches mortas/ambiente de teste local e dividir os três maiores arquivos do projeto, sem nenhuma mudança de comportamento.

**Architecture:** Refatoração por movimento de código: cada arquivo grande vira módulos com uma responsabilidade, mantendo os pontos de entrada públicos (`apiClient`, rotas de `/montagens`, `FichaForm`) idênticos. A suíte existente é a rede de segurança; testes novos só cobrem o que ela não cobre e a refatoração pode quebrar (efeitos do `request`, injeção de dependência do módulo, bloqueio de edição da ficha).

**Tech Stack:** Next.js 16 + React Hook Form + zod + Vitest (client); NestJS 11 + Prisma 7 + Jest (server); Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-11-06-fase2-enxugar-design.md`

## Global Constraints

- Nenhuma mudança de comportamento: rotas, payloads, textos, labels, `id`s de campo e regras R1–R9 idênticos.
- Nenhuma asserção de teste existente é alterada; testes só mudam de arquivo ou de import. Contagem mínima ao final: server 243, client 180 (mais os novos deste plano).
- Pontos de entrada preservados: `import { apiClient, ApiError, avisosDoErro } from '@/lib/api-client'`, `import { FichaForm } from '@/components/fichas/ficha-form'`, todas as rotas de `MontagensController`.
- Tamanho alvo: `api-client.ts` ≤ ~150 linhas, `montagens.service.ts` ≤ ~260, `ficha-form.tsx` ≤ ~130; nenhum arquivo novo acima de ~260.
- Comentários em português, no tom e densidade dos arquivos de origem; comentários existentes viajam junto com o código que explicam.
- Commits sem trailer `Co-Authored-By` (preferência do usuário).
- Sem dependência nova. Se alguma for tocada: `rm -rf node_modules && npm ci`, e no server também em Node 20.
- Trabalho no worktree `/Users/lucassiqueira/dev/sgm-core-fase2`, branch `chore/enxugar-fase2`. Nunca tocar `/Users/lucassiqueira/dev/sgm-core` (servidores do usuário em 3000/3005), o banco `sgm_core`, o processo na porta 3001 nem o container `repara-frontend-frontend-1`.

**Comandos de verificação** (referidos nas tasks como "checks"):

```bash
# server (de server/)
DATABASE_URL=postgresql://x:x@localhost:5432/x npx prisma generate >/dev/null
npx eslint src --quiet && npx tsc --noEmit && npx jest 2>&1 | grep -E "^Tests:" && npm run build
# client (de client/)
npx eslint . --quiet && npx tsc --noEmit && npx vitest run 2>&1 | grep -E "Tests " && npm run build
# E2E (da raiz) — banco sgm_core_test, portas 3010/3011
CI=1 npx playwright test
```

## Review Focus

1. **Sessão expirada (401) no `request`** → precisa continuar disparando `sgm:sessao-expirada`, senão o usuário fica numa tela quebrada em vez de ir pro login. Teste novo na Task 2.
2. **Aviso "sem conexão"** → resposta com header `x-from-cache` precisa continuar chamando `markServedFromCache`, e as demais `markServedFresh`. Teste novo na Task 2.
3. **Injeção de dependência do `MontagemModule`** → os specs instanciam services à mão, então um provider esquecido só aparece ao subir o app (500 em resumo/candidatos, que o E2E não exercita). Teste novo na Task 3.
4. **R7 nos três services de montagem** → montagem de outra paróquia continua dando 404 com a mesma mensagem em exportCsv, listarLog, listarObservacoes, resumo, candidatos e coordenadores. Coberto pelos `describe` existentes que migram; a Task 3 confere que cada um foi parar no spec certo.
5. **Bloqueio de edição da ficha** → ao editar, os campos hoje `disabled={bloqueado}` (nome, nascimento, naturalidade, nº do encontro, círculo, pai, mãe, escolaridade…) continuam travados; ao criar, livres. Teste novo na Task 4.

---

### Task 0: Issue da fase 2 no GitHub Project

**Files:** nenhum.

- [ ] **Step 1:** Despachar o agente `scrum` para criar a issue "Fase 2 — enxugar código e repositório" no GitHub Project (https://github.com/users/Lucassec1/projects/2), com a história de usuário, o escopo A/B1/B2/B3 e os critérios de aceite copiados da seção "Critérios de aceite" da spec, apontando para o arquivo da spec. Pedir que siga o template `.github/ISSUE_TEMPLATE/historia.md`.
- [ ] **Step 2:** Anotar o número da issue (`#N`) para o commit/PR final.

---

### Task 1: Branches mortas e ambiente local (A)

**Files:** nenhum no repositório.

- [ ] **Step 1: Listar candidatas**

Run: `git fetch --prune && git branch -r --merged origin/main | grep -vE 'HEAD|origin/main$|origin/producao$'`
Expected: ~47 branches `origin/...`. Conferir também `git branch -r --no-merged origin/main` (essas **não** são tocadas).

- [ ] **Step 2: Confirmação do usuário** — mostrar a lista completa e esperar um "sim" explícito. Sem confirmação, pular para o Step 4.

- [ ] **Step 3: Apagar no remoto**

Run: `git push origin --delete <b1> <b2> ...` (nomes sem o prefixo `origin/`).
Expected: `git branch -r` mostra só `origin/main`, `origin/producao` e eventuais não mergeadas.

- [ ] **Step 4: Limpar ambiente local de teste**

Parar as tasks em background dos servidores de teste (portas 3006 e 3007, worktree `sgm-core-recuperar-senha`) pelo `TaskStop` da sessão; depois:

```bash
docker exec sgm-core-postgres dropdb -U sgm --force --if-exists sgm_recuperar
git -C /Users/lucassiqueira/dev/sgm-core worktree remove --force ../sgm-core-lockfix
git -C /Users/lucassiqueira/dev/sgm-core worktree remove --force ../sgm-core-recuperar-senha
git -C /Users/lucassiqueira/dev/sgm-core branch -d docs/deploy-branch-producao feat/recuperar-senha-email fix/lockfile-server
```

Expected: `git worktree list` mostra só `sgm-core` e `sgm-core-fase2`; `lsof -iTCP:3006 -iTCP:3007 -sTCP:LISTEN` vazio. `branch -d` (não `-D`): se recusar por não mergeada, parar e reportar.

---

### Task 2: Dividir `client/lib/api-client.ts` (B1)

**Files:**

- Create: `client/lib/api/request.ts`, `auth.ts`, `fichas.ts`, `fichas-casais.ts`, `montagens.ts`, `conselho.ts`, `telao.ts`
- Create: `client/lib/api/request.test.ts`
- Modify: `client/lib/api-client.ts` (vira só composição/reexport)

**Interfaces:**

- Produces (`lib/api/request.ts`): `export const API_URL: string`; `export class ApiError extends Error { status: number; body: unknown }`; `export function avisosDoErro(err: unknown): AvisoRegra[] | null`; `export async function request<T>(path: string, options?: RequestInit): Promise<T>`; `export function buildQuery(params: object): string`.
- Produces (cada domínio): um objeto `export const authApi = { ... }`, `fichasApi`, `fichasCasaisApi`, `montagensApi`, `conselhoApi`, `telaoApi`, com os métodos de mesmo nome e assinatura que hoje estão em `apiClient`. Tipos `Role` e `SessaoAtual` em `auth.ts`; `ParoquiaComConta` em `conselho.ts`.
- Produces (`lib/api-client.ts`): `export const apiClient = { ...authApi, ...fichasApi, ...fichasCasaisApi, ...montagensApi, ...conselhoApi, ...telaoApi }`; reexporta `ApiError`, `avisosDoErro`, `Role`, `SessaoAtual`, `ParoquiaComConta`.

Distribuição dos métodos (exatamente os de hoje): **auth** login, logout, alterarSenha, esqueciSenha, redefinirSenha, me · **fichas** listFichas, getFicha, createFicha, updateFicha, deleteFicha, historicoEquipesFicha, uploadFotoFicha, removerFotoFicha, listEncontros, exportFichasUrl · **fichas-casais** listFichasCasais, getFichaCasal, createFichaCasal, updateFichaCasal, deleteFichaCasal, historicoEquipesFichaCasal, uploadFotoFichaCasal, removerFotoFichaCasal, exportFichasCasaisUrl · **montagens** listEquipes, listMontagens, getMontagem, createMontagem, updateMontagem, listAlocacoes, createAlocacao, deleteAlocacao, updateAlocacao, listCandidatosJovens, listCandidatosCasais, coordenadoresSugeridos, listListaSubstituicao, createListaSubstituicaoItem, deleteListaSubstituicaoItem, listLog, listObservacoes, resumoMontagem, listQuadrantes, uploadQuadrante, quadranteDownloadUrl, deleteQuadrante, exportMontagemUrl · **conselho** listParoquias, createParoquia, alterarEmailParoquia, redefinirAcessoParoquia, conselhoListMontagens, conselhoGetMontagem, conselhoListObservacoes, conselhoCriarObservacao · **telao** getTelaoMontagem.

- [ ] **Step 1: Baseline** — rodar os checks do client; anotar a contagem (esperado `Tests 180 passed`).

- [ ] **Step 2: Escrever `client/lib/api/request.test.ts` (Review Focus 1 e 2)** contra `./request`:

```ts
it('dispara sgm:sessao-expirada quando a API responde 401', async () => {
  // fetch mockado → 401 { message: 'Unauthorized' }
  // espera: request('/auth/me') rejeita com ApiError status 401
  //        e um listener de 'sgm:sessao-expirada' foi chamado 1x
});
it('marca resposta vinda do cache (x-from-cache) e limpa o aviso nas demais', async () => {
  // vi.mock('../offline-status'); fetch 200 com header x-from-cache: true → markServedFromCache 1x
  // fetch 200 sem o header → markServedFresh 1x
});
it('buildQuery ignora undefined e string vazia', () => {
  expect(buildQuery({ a: 1, b: undefined, c: '', e: 'x' })).toBe('a=1&e=x');
});
```

(`null` hoje vira `"null"` na query — comportamento existente, fora do escopo; o teste não o fixa nem o muda.)

- [ ] **Step 3:** Rodar `npx vitest run lib/api/request.test.ts` → FAIL (`Cannot find module './request'`).

- [ ] **Step 4:** Criar os 7 arquivos movendo o código sem alterar corpo de método; `api-client.ts` vira a composição descrita em Interfaces.

- [ ] **Step 5:** Rodar os checks do client → mesma contagem de antes + 3; `api-client.test.ts` e os 8 testes com `vi.mock('@/lib/api-client')` passam sem alteração. `wc -l client/lib/api-client.ts client/lib/api/*.ts` dentro do tamanho alvo.

- [ ] **Step 6: Commit**

```bash
git add client/lib/api-client.ts client/lib/api
git commit -m "refactor(client): divide api-client por domínio em lib/api/ (sem mudança de comportamento)"
```

---

### Task 3: Dividir `server/src/modules/montagem/montagens.service.ts` (B2)

**Files:**

- Create: `server/src/modules/montagem/montagem-da-paroquia.ts`
- Create: `server/src/modules/montagem/sugestoes-montagem.service.ts`, `resumo-montagem.service.ts`
- Create: `server/src/modules/montagem/sugestoes-montagem.service.spec.ts`, `resumo-montagem.service.spec.ts`, `montagem.module.spec.ts`
- Modify: `montagens.service.ts`, `montagens.service.spec.ts`, `montagens.controller.ts`, `montagem.module.ts`

**Interfaces:**

- Produces: `export async function garantirMontagemDaParoquia(prisma: PrismaService, id: string, paroquiaId: string): Promise<Montagem>` — mesmo corpo e mensagem do atual `garantirPertence` (`NotFoundException('Montagem ${id} não encontrada')`).
- `MontagensService(prisma, logAtividade)`: create, findAll, findOne, update, exportCsv; mantém `VAGAS_INCLUDE`, constantes de implantação e `calcularCasaisVisitacao`.
- `SugestoesMontagemService(prisma)`: coordenadoresSugeridos, candidatosJovens, candidatosCasais; privados vagaDaMontagem, idsQueSairam, vezesNaEquipe.
- `ResumoMontagemService(prisma, logAtividade)`: resumo, listarLog, listarObservacoes; privados equipeComMaisMovimentacao, duracaoAteFinalizarMs, historicoDuracao.
- Assinaturas públicas idênticas às atuais. Onde hoje se chama `this.garantirPertence(id, paroquiaId)`, passa a `garantirMontagemDaParoquia(this.prisma, id, paroquiaId)`.

- [ ] **Step 1: Baseline** — checks do server; anotar `Tests: 243 passed`.

- [ ] **Step 2: Escrever `montagem.module.spec.ts` (Review Focus 3)**:

```ts
it('MontagemModule resolve o controller com os três services', async () => {
  const moduleRef = await Test.createTestingModule({ imports: [MontagemModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .compile();
  const controller = moduleRef.get(MontagensController);
  expect(controller).toBeDefined();
  expect(moduleRef.get(SugestoesMontagemService)).toBeDefined();
  expect(moduleRef.get(ResumoMontagemService)).toBeDefined();
});
```

Se o `PrismaModule` global não estiver disponível no teste, importar `PrismaModule` junto e manter o override.

- [ ] **Step 3:** Rodar `npx jest montagem.module` → FAIL (serviços não existem).

- [ ] **Step 4:** Criar `montagem-da-paroquia.ts` e os dois services movendo os métodos sem alterar corpo (além da troca de `garantirPertence`); `MontagensController` injeta os três e cada rota chama o mesmo método de antes no service novo; registrar os providers em `montagem.module.ts`.

- [ ] **Step 5:** Mover os testes: cada `it` de `montagens.service.spec.ts` vai para o spec do service cujo método ele chama, dentro de um `describe` com o **mesmo nome**; o setup (`criarPrismaMock`, constantes) é copiado ao spec que precisar. Blocos que testam métodos de mais de um service (ex.: "R7 — isolamento por paróquia (garantirPertence)") são divididos por service mantendo o nome. Nenhuma asserção muda.

- [ ] **Step 6:** Checks do server → `Tests: 244 passed` (243 + o do módulo). Conferir com `grep -c "it(" server/src/modules/montagem/*montagem*.spec.ts` que a soma dos três specs de service é igual à do spec original.

- [ ] **Step 7:** E2E → `4 passed`.

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/montagem
git commit -m "refactor(server): divide MontagensService em montagens, sugestões e resumo (sem mudança de comportamento)"
```

- [ ] **Step 9: Revisão do `qa`** — despachar o agente `qa` com o diff deste commit, focando R3 (coordenadores), R5 (prioridade de candidatos), R7 (pertencimento) e a injeção de dependência. Achado de regressão confirmado → corrigir, re-rodar checks e E2E, commit `fix(server): ...`.

---

### Task 4: Dividir `client/components/fichas/ficha-form.tsx` (B3)

**Files:**

- Create em `client/components/fichas/ficha-form/`: `ficha-schema.ts`, `section-title.tsx`, `identificacao-section.tsx`, `endereco-section.tsx`, `filiacao-section.tsx`, `escolaridade-section.tsx`, `religiao-section.tsx`, `convite-section.tsx`
- Create: `client/components/fichas/ficha-form.test.tsx`
- Modify: `client/components/fichas/ficha-form.tsx`

**Interfaces:**

- Produces (`ficha-schema.ts`): `export const fichaSchema` (o `z.object` atual, inalterado) e `export type FichaFormValues = z.infer<typeof fichaSchema>`.
- Produces (cada seção): `export function XxxSection({ bloqueado }: { bloqueado: boolean })`, lendo `register`, `watch`, `setValue` e `formState.errors` de `useFormContext<FichaFormValues>()`. Seções sem campo bloqueável ignoram a prop mas a aceitam, para o pai passar igual a todas.
- `FichaForm({ ficha }: { ficha?: Ficha })` mantém a assinatura, envolve o `<form>` em `<FormProvider {...methods}>` e continua dono de: `useForm`, efeito de `reset`, mutations, `onSubmit`, o bloco de situação/motivo de desativação, o campo `observacoes` e o botão de submit.

- [ ] **Step 1: Escrever `ficha-form.test.tsx` (Review Focus 5)**, renderizando com `QueryClientProvider` e `next/navigation` mockado, no padrão de `app/login/page.test.tsx`:

```ts
it('ao editar, trava os campos de identificação e filiação', () => {
  // render(<FichaForm ficha={fichaFake} />)
  // expect(screen.getByLabelText('Nome completo')).toBeDisabled();
  // idem: 'Nº do encontro', 'Nome do pai'
});
it('ao criar, os mesmos campos ficam editáveis', () => {
  // render(<FichaForm />) → os mesmos labels .not.toBeDisabled()
});
it('mostra erro de validação ao enviar vazio', async () => {
  // clicar 'Criar ficha' → findByText('Informe o nome completo')
});
```

Montar `fichaFake` a partir do tipo `Ficha` de `lib/types.ts`.

- [ ] **Step 2:** `npx vitest run components/fichas/ficha-form.test.tsx` → PASS já no código atual. É um teste de caracterização: tem que passar antes **e** depois da divisão.

- [ ] **Step 3:** Criar os arquivos em `ficha-form/` movendo cada `<section>` (Identificação, Endereço, Filiação, Escolaridade, Religião, Convite), na mesma ordem e com o mesmo markup; `ficha-form.tsx` passa a importar `fichaSchema`/`FichaFormValues` de `./ficha-form/ficha-schema`.

- [ ] **Step 4:** Checks do client → contagem da Task 2 + 3, `ficha-form.test.tsx` passando, `wc -l client/components/fichas/ficha-form.tsx` ≤ ~130.

- [ ] **Step 5:** E2E → `4 passed` (o de fichas preenche o formulário pelos labels).

- [ ] **Step 6: Commit**

```bash
git add client/components/fichas
git commit -m "refactor(client): divide ficha-form em seções com useFormContext (sem mudança de comportamento)"
```

---

### Task 5: Revisão final e PR

- [ ] **Step 1:** Rodar checks do server, do client e E2E na branch inteira; anotar as contagens finais.
- [ ] **Step 2:** Despachar o `qa` para revisar `git diff origin/main...chore/enxugar-fase2`, procurando mudança de comportamento. Achado confirmado → corrigir e repetir o Step 1.
- [ ] **Step 3:** Conferir os critérios de aceite da spec, um a um, com evidência (contagens, `wc -l`, `git branch -r`).
- [ ] **Step 4:** `git push -u origin chore/enxugar-fase2` e abrir o PR para `main` com `Closes #N` (Task 0) — ou entregar o link para o usuário abrir, conforme ele preferir.
