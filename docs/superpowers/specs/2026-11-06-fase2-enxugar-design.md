# Fase 2 — Enxugar código e repositório

Data: 06/11/2026 · Status: aprovado em conversa, aguardando revisão da spec escrita

## Contexto

Plano "projeto 100%" em três fases: (1) pronto para as paróquias — **pausada** (encontros passados,
pessoa de fora, carga inicial, exportação); (2) enxugar — **esta spec**; (3) acabamento visual/UX.

O levantamento (06/11/2026) mostrou que quase não há código morto: das 61 rotas do server, todas
têm uso (export/download/health incluídos), e no client só sobram 1 componente e 3 métodos sem uso.
O usuário escolheu, dentre os itens levantados, **só** estes dois:

- **A.** Apagar branches mortas e limpar o ambiente local de testes.
- **B.** Dividir os três arquivos grandes em partes com uma responsabilidade cada.

Ficam **fora** (decisão do usuário): remover código sem uso (`scroll-area`, `useEquipes`,
`deleteFicha`/`deleteFichaCasal`), extrair duplicação jovem × casal, atualizar docs de status.

## Regra geral

**Nenhuma mudança de comportamento.** Rotas, payloads, telas, textos e regras R1–R9 ficam
idênticos. A prova é a suíte existente passando sem alteração de asserções (testes só mudam de
arquivo ou de import, nunca de expectativa), mais lint, typecheck, build e E2E.

## A — Branches mortas e ambiente local

1. **Remoto:** apagar as branches que `git branch -r --merged origin/main` lista, exceto `main` e
   `producao` (47 em 06/11/2026). A lista final é mostrada ao usuário e só é apagada após
   confirmação explícita. Branch não mergeada não é tocada.
2. **Local:** parar os servidores de teste (portas 3006/3007), apagar o banco `sgm_recuperar` do
   container `sgm-core-postgres`, remover os worktrees `../sgm-core-lockfix` e
   `../sgm-core-recuperar-senha` e suas branches locais já mergeadas.
3. Não mexer: checkout principal (`../sgm-core`, com servidores do usuário em 3000/3005), o banco
   `sgm_core`, o processo antigo na 3001, o container `repara-frontend`.

## B1 — `client/lib/api-client.ts` (515 linhas)

Novos arquivos em `client/lib/api/`:

| Arquivo            | Conteúdo                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `request.ts`       | `API_URL`, `ApiError`, `avisosDoErro`, `request<T>()` (inclui sinal offline e evento de sessão expirada), `buildQuery`                   |
| `auth.ts`          | login, logout, me, alterarSenha, esqueciSenha, redefinirSenha; tipos `Role`, `SessaoAtual`                                               |
| `fichas.ts`        | fichas de jovem: CRUD, histórico, foto, encontros, URL de exportação                                                                     |
| `fichas-casais.ts` | fichas de casal: idem                                                                                                                    |
| `montagens.ts`     | equipes, montagens, alocações, candidatos, coordenadores, lista de substituição, log, observações, resumo, quadrantes, URL de exportação |
| `conselho.ts`      | paróquias (lista/criar/e-mail/redefinir acesso) e leitura de montagens/observações do Conselho; tipo `ParoquiaComConta`                  |
| `telao.ts`         | `getTelaoMontagem`                                                                                                                       |

`client/lib/api-client.ts` passa a só reexportar: `export const apiClient = { ...authApi, ...fichasApi, ... }`,
mais `ApiError`, `avisosDoErro` e os tipos hoje exportados. **Os 19 arquivos que importam de
`@/lib/api-client` e os 8 testes com `vi.mock('@/lib/api-client')` não mudam.** O teste existente
`lib/api-client.test.ts` continua cobrindo o `apiClient` montado (método, caminho, corpo).

Cada domínio usa só `request`/`buildQuery`/`API_URL` de `request.ts`; nenhum domínio importa outro.

## B2 — `server/src/modules/montagem/montagens.service.ts` (583 linhas)

| Classe                     | Métodos                                                                                                                               | Tamanho alvo |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `MontagensService`         | `create`, `findAll`, `findOne`, `update`, `exportCsv`; constantes de implantação e `calcularCasaisVisitacao` (R6)                     | ~250         |
| `SugestoesMontagemService` | `coordenadoresSugeridos` (R3), `candidatosJovens` (R5), `candidatosCasais`; helpers `vagaDaMontagem`, `idsQueSairam`, `vezesNaEquipe` | ~220         |
| `ResumoMontagemService`    | `resumo`, `listarLog`, `listarObservacoes`; helpers `equipeComMaisMovimentacao`, `duracaoAteFinalizarMs`, `historicoDuracao`          | ~110         |

- A checagem R7 `garantirPertence(id, paroquiaId)`, usada pelos três, vira uma função em
  `montagem/montagem-da-paroquia.ts` (recebe o `PrismaService`), seguindo o padrão de
  `pessoa-da-paroquia.ts`. Mesma mensagem e mesmo `NotFoundException`.
- `MontagensController` injeta os três services; **rotas, decorators e guards idênticos**.
- `MontagemModule` registra os dois services novos.
- `montagens.service.spec.ts` é dividido em três specs, um por service, movendo os `describe`
  correspondentes sem alterar asserções. Nenhum outro módulo depende de `MontagensService`
  (o `ConselhoService` só o cita em comentário).

## B3 — `client/components/fichas/ficha-form.tsx` (484 linhas)

- Schema zod e tipo do formulário → `components/fichas/ficha-form/ficha-schema.ts`.
- Cada uma das 6 `<section>` atuais vira um componente em `components/fichas/ficha-form/`, na mesma
  ordem: `identificacao-section.tsx` (Identificação — inclui encontro/círculo, como hoje),
  `endereco-section.tsx`, `filiacao-section.tsx`, `escolaridade-section.tsx`,
  `religiao-section.tsx`, `convite-section.tsx`. Cada uma lê o formulário via `useFormContext`
  (o `FichaForm` passa a envolver com `FormProvider`). O `SectionTitle` vai junto, num
  `section-title.tsx` compartilhado pelas seções.
- `components/fichas/ficha-form.tsx` mantém o export `FichaForm` (mesmo caminho de import) e fica só
  com montagem das seções + submit, ~120 linhas.
- Mesma ordem de campos, mesmos `id`/`label` (o E2E de fichas e os testes usam os labels).

## Execução

Branch `chore/enxugar-fase2` (worktree `../sgm-core-fase2`), a partir de `main` em `3156fad`.

1. `scrum`: criar a issue da fase 2 no GitHub Project com os critérios de aceite abaixo.
2. A (com confirmação da lista de branches).
3. B1 → commit. B2 → commit → revisão do agente `qa` focada em R3/R5/R7. B3 → commit.
   Em cada commit: lint, typecheck, testes (server e client), build; E2E ao fim de B2 e de B3.
   Depois de mexer em dependência (não previsto): `npm ci` limpo, inclusive em Node 20 no server.
4. `qa`: revisão final do diff completo.
5. PR para `main` com `Closes #N` (o usuário decide se abre ou se Claude abre).

## Critérios de aceite

- [ ] Só `main` e `producao` (e branches não mergeadas, se houver) restam no remoto; ambiente local
      de teste removido, sem tocar no checkout principal nem no banco `sgm_core`.
- [ ] `api-client.ts`, `montagens.service.ts` e `ficha-form.tsx` com no máximo ~150, ~260 e ~130
      linhas; nenhum arquivo novo acima de ~260.
- [ ] Nenhuma asserção de teste alterada; mesmo número de testes (server 243, client 180) ou mais.
- [ ] CI completo verde (server, client, E2E) no PR.
- [ ] Revisão do `qa` sem achado de regressão em aberto.
