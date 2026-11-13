# Implantação conduzida pelo Conselho — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O Conselho registra e conduz o vínculo madrinha → afilhada. A madrinha atua pela afilhada
durante a implantação, e os encontros 1–3 da afilhada nascem com as vagas dos Anexos I–III.

**Architecture:** Um módulo novo, `implantacao`, no server: vínculo, fases e anexos. A atuação é
uma troca de `paroquiaId` na sessão (JWT), conferida a cada requisição na `JwtStrategy`, então os
guards e serviços existentes continuam iguais. As exceções à R7 ficam concentradas num helper só
(`pessoas-elegiveis.ts`), usado pela busca de candidatos e pela alocação.

**Tech Stack:** NestJS 11 + Prisma 7 (Jest) · Next.js 16 + React Query + shadcn (Vitest) · Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-implantacao-design.md`

## Global Constraints

- Não violar R1–R9 além das mudanças que a spec registra (R5, R6, R7, R8). R1–R3 continuam como
  badge; R4 continua pedindo confirmação.
- O `paroquiaId` nunca vem do client. Na atuação ele vem da sessão, conferido no servidor a cada
  requisição.
- O Conselho nunca recebe dados de ficha. Nas implantações, só contagens e nomes de paróquia.
- Textos em sentence case, "…", sem "·" juntando metadados (usar `MetaLista`), conforme
  `docs/design-system.md`.
- Commits sem trailer `Co-Authored-By`.
- Migration só com colunas novas opcionais ou com padrão. Nenhum `DROP` ou `RENAME` de coluna:
  renomear campo no Prisma com `@map` mantendo o nome da coluna.
- Rodar os testes de server de dentro de `server/` e os de client de dentro de `client/`.

## Review Focus

1. **Fase muda com a madrinha atuando.** A requisição seguinte já opera na madrinha e o `me` devolve
   `atuando: null`. Teste no Task 5.
2. **Marca de sementeira inválida:** vínculo de outra madrinha, fora da fase Sementeira, ou ficha de
   outra paróquia. Responde 404 ou 400 sem gravar. Teste no Task 4.
3. **Ficha da madrinha numa montagem da afilhada que não é de anexo** (ex.: encontro 4) durante a
   Implantação. Responde 404, como a R7 já faz. Teste no Task 6.
4. **Afilhada já com vínculo não encerrado, ou afilhada que é madrinha de outro vínculo ativo.**
   Responde 409. Teste no Task 3.
5. **Iniciar a implantação transfere só as fichas marcadas com esse vínculo e da madrinha,** mesmo
   que outra madrinha tenha marcado fichas para outro vínculo. Teste no Task 3.

---

### Task 1: Schema e migration

**Files:**

- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_implantacao/migration.sql` (gerado)

**Interfaces — Produces:**

- `enum FaseImplantacao { SEMENTEIRA IMPLANTACAO ACOMPANHAMENTO ENCERRADA }`
- `enum OrigemVaga { MADRINHA AFILHADA }`
- `model Implantacao`:
  - `id`, `madrinhaId`, `afilhadaId`, `fase` (padrão `SEMENTEIRA`), `criadaPorId`;
  - `createdAt`, `implantacaoIniciadaEm?`, `acompanhamentoIniciadoEm?`, `encerradaEm?`;
  - relações `madrinha`/`afilhada` → `Paroquia` (nomes de relação `ImplantacaoMadrinha` e
    `ImplantacaoAfilhada`), `criadaPor` → `Usuario`;
  - índices em `madrinhaId` e `afilhadaId`.
- `model LiberacaoFicha`: `id`, `implantacaoId`, `fichaId?`, `fichaCasalId?`, `createdAt`;
  `@@unique([implantacaoId, fichaId])` e `@@unique([implantacaoId, fichaCasalId])`.
- `Ficha.sementeiraDeId String?` → `Implantacao`.
- `Montagem`:
  - `implantacaoId String?` e `anexoImplantacao Int?`;
  - `sementeiraDeImplantacaoId String?` (relação `MontagemSementeira`);
  - `recebeSementeira Boolean @default(false) @map("ehImplantacao")`, substituindo o campo
    `ehImplantacao`;
  - `paroquiaAfilhadaNome` continua como está (legado, só exibição).
- `VagaMontagem.origem OrigemVaga?` e `VagaMontagem.quantidadeJovens Int @default(0)`.

- [ ] **Step 1:** Editar o schema como acima. Renomear `ehImplantacao` → `recebeSementeira` em todo o
      server (`grep -rn ehImplantacao server/src server/prisma`), mantendo o DTO público
      `ehImplantacao` por enquanto (o Task 7 troca).
- [ ] **Step 2:** `cd server && npx prisma migrate dev --name implantacao`. Expected: migration
      criada, sem `DROP` nem `RENAME` no SQL (conferir o arquivo).
- [ ] **Step 3:** `npx tsc --noEmit -p tsconfig.json && npx jest`. Expected: typecheck limpo e 244
      testes passando.
- [ ] **Step 4:** Commit `feat(server): schema da implantação (vínculo, liberação, origem da vaga)`.

### Task 2: Anexos I–III como dados

**Files:**

- Create: `server/src/modules/implantacao/anexos.ts`
- Test: `server/src/modules/implantacao/anexos.spec.ts`

**Interfaces — Produces:**

```ts
export interface LinhaAnexo {
  equipe: string; // slug de EQUIPES (prisma/seed-equipes.ts)
  cargo: string; // nome de cargo existente nessa equipe
  origem: 'MADRINHA' | 'AFILHADA';
  casais: number;
  rapazes: number;
  mocas: number;
  jovens: number;
}
export const ANEXOS: Record<1 | 2 | 3, LinhaAnexo[]>;
```

Regras de transcrição (de `docs/implantacao.md`, linhas 106–212):

- "N jovens (x rapaz(es) e y moça(s))" vira `rapazes`/`mocas`. "N jovens" sem divisão vira
  `jovens`.
- Comandantes Gerais e Comandantes Jovens: equipe `comando-geral`, cargos com esses nomes.
- **Eq. da Sala** (cargos próprios):
  - um cargo citado pelo nome (Pilotos, Copilotos) vai para ele;
  - "Componentes" é distribuído pelos cargos não citados, na ordem do seed, com as quantidades do
    seed;
  - o casal de componentes vai para Copilotos;
  - "Todos da Paróquia Madrinha" (Anexo I) vira todos os cargos da Sala com a origem `MADRINHA` e as
    quantidades do seed.
- Uma linha que soma mais de uma origem no mesmo cargo vira duas linhas.

- [ ] **Step 1: Escrever o teste com os números da norma:**

```ts
const RESUMO = {
  1: { MADRINHA: { jovens: 108, casais: 18 }, AFILHADA: { jovens: 22, casais: 33 } },
  2: { MADRINHA: { jovens: 52, casais: 17 }, AFILHADA: { jovens: 78, casais: 34 } },
  3: { MADRINHA: { jovens: 28, casais: 1 }, AFILHADA: { jovens: 102, casais: 50 } },
};
const PESSOAS_POR_EQUIPE = {
  'comando-geral': 4,
  espiritualizadora: 4,
  animacao: 16,
  canto: 12,
  circulos: 26,
  cozinha: 16,
  estacionamento: 12,
  faxina: 14,
  grafica: 12,
  lanche: 12,
  'liturgia-e-vigilia': 18,
  minimercado: 8,
  prover: 4,
  sala: 16,
  'vigilia-paroquial': 16,
  visitacao: 42,
};
```

- `it.each([1,2,3])('anexo %i bate com o RESUMO por origem')`: soma de
  `rapazes+mocas+jovens` = jovens, soma de `casais` = casais.
- `it.each([1,2,3])('anexo %i: pessoas por equipe')`: soma de `casais*2 + rapazes + mocas +
jovens` por equipe = `PESSOAS_POR_EQUIPE`, total 232.
- `it('toda linha aponta pra equipe e cargo existentes')`: cada `(equipe, cargo)` existe em
  `EQUIPES`, importado de `../../../prisma/seed-equipes`.
- [ ] **Step 2:** `npx jest src/modules/implantacao/anexos.spec.ts`. Expected: FAIL (módulo não
      existe).
- [ ] **Step 3:** Transcrever `ANEXOS`. **Se uma soma não fechar por erro do próprio documento,
      parar e levar a divergência ao Lucas** (não ajustar por conta). Registrar a decisão dele em
      comentário na linha e no ledger.
- [ ] **Step 4:** Rodar de novo. Expected: PASS.
- [ ] **Step 5:** Commit `feat(server): anexos I–III da norma de implantação como dados`.

### Task 3: Vínculo e fases (lado Conselho)

**Files:**

- Create: `server/src/modules/implantacao/implantacao.module.ts`, `implantacoes.service.ts`,
  `conselho-implantacoes.controller.ts`, `dto/create-implantacao.dto.ts`, `dto/liberar-acesso.dto.ts`
- Modify: `server/src/app.module.ts`, `server/src/modules/paroquias/paroquias.service.ts`
- Test: `server/src/modules/implantacao/implantacoes.service.spec.ts`

**Interfaces — Produces:**

- `ImplantacoesService`:
  - `criar(dto: { afilhadaNome: string; madrinhaId: string }, conselhoUsuarioId: string)`: cria a
    `Paroquia` (sem usuário) e a `Implantacao` numa transação.
  - `listar()`: `{ id, fase, madrinha:{id,nome}, afilhada:{id,nome}, afilhadaTemConta: boolean,
fichasSementeira: number, datas }[]`.
  - `iniciarImplantacao(id)`: devolve `{ transferidas: number }`.
  - `passarParaAcompanhamento(id)` e `encerrar(id)`.
  - `liberarAcesso(id, email)`: delega a `ParoquiasService.criarConta(paroquiaId, email)`.
- `ParoquiasService.criarConta(paroquiaId: string, email: string)`: cria o `Usuario` PAROQUIA. Se
  já existir usuário, `ConflictException` ("Use alterar e-mail").
- Rotas (`@Roles(CONSELHO)`, prefixo `conselho/implantacoes`):
  - `GET /`, `POST /`;
  - `POST /:id/iniciar`, `POST /:id/acompanhamento`, `POST /:id/encerrar`;
  - `POST /:id/acesso { email }`.

Regras:

- **Transições:** só para frente, cada uma a partir da fase imediatamente anterior. Fora disso,
  `BadRequestException`.
- **Iniciar:** é `updateMany` em `Ficha` com
  `where { sementeiraDeId: id, paroquiaId: madrinhaId }` → `paroquiaId: afilhadaId`, na mesma
  transação da mudança de fase.
- **Conflitos (409):**
  - `madrinhaId` igual à paróquia afilhada criada (impossível pelo fluxo, mas validar);
  - madrinha que é afilhada num vínculo não encerrado;
  - afilhada com vínculo não encerrado.

- [ ] **Step 1: Testes:**
  - `criar` grava a paróquia sem usuário e o vínculo em SEMENTEIRA;
  - `criar` com madrinha que é afilhada ativa → 409;
  - `iniciarImplantacao` transfere 2 fichas do vínculo e **não** a ficha marcada com outro vínculo
    (Review Focus 5), e devolve `{ transferidas: 2 }`;
  - `iniciarImplantacao` fora de SEMENTEIRA → 400;
  - `encerrar` a partir de IMPLANTACAO → 400;
  - `listar` não expõe nenhum campo de ficha além da contagem.
- [ ] **Step 2:** `npx jest src/modules/implantacao`. Expected: FAIL.
- [ ] **Step 3:** Implementar o service, o controller, os DTOs (class-validator, `@Trim` no e-mail
      como em `create-paroquia.dto.ts`), o módulo e o registro no `AppModule`.
- [ ] **Step 4:** Rodar de novo, depois `npx jest`. Expected: PASS em tudo.
- [ ] **Step 5:** Commit `feat(server): vínculo de implantação e fases conduzidas pelo Conselho`.

### Task 4: Lado da madrinha — vínculos, marca de sementeira, liberações

**Files:**

- Create: `server/src/modules/implantacao/implantacoes-paroquia.controller.ts`
- Modify: `implantacoes.service.ts`, `server/src/modules/fichas/dto/*` (update),
  `server/src/modules/fichas/fichas.service.ts`
- Test: `implantacoes.service.spec.ts`, `server/src/modules/fichas/fichas.service.spec.ts`

**Interfaces — Produces:**

- `GET /implantacoes/minhas` (paróquia): vínculos não encerrados em que a sessão é madrinha →
  `{ id, fase, afilhada:{id,nome} }[]`.
- `UpdateFichaDto.sementeiraDeId?: string | null` (e o mesmo no create).
  - **Validação:** vínculo com `madrinhaId = paroquiaId` da sessão e fase `SEMENTEIRA`. Senão,
    `NotFoundException('Implantação não encontrada')`.
  - **Desmarcar** (`null`) só é permitido em SEMENTEIRA.
- `POST /implantacoes/:id/liberacoes { fichaId? | fichaCasalId? }` e
  `DELETE /implantacoes/:id/liberacoes/:liberacaoId`:
  - só a madrinha do vínculo, fase `ACOMPANHAMENTO`, ficha da madrinha;
  - `GET /implantacoes/:id/liberacoes` lista com nome.
- A ficha devolvida pelo `findOne`/`findAll` inclui `sementeiraDe: { afilhada: { nome } } | null`.

- [ ] **Step 1: Testes:**
  - marcar sementeira com vínculo de outra madrinha → 404 sem gravar;
  - marcar com vínculo em IMPLANTACAO → 404;
  - marcar válido grava;
  - `minhas` não lista vínculo encerrado;
  - liberar fora de ACOMPANHAMENTO → 400;
  - liberar ficha de outra paróquia → 404.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx jest`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(server): marca de sementeira e liberação de fichas pela madrinha`.

### Task 5: Atuar como afilhada

**Files:**

- Modify:
  - `server/src/common/types/usuario-autenticado.ts`;
  - `server/src/modules/auth/strategies/jwt.strategy.ts`;
  - `server/src/common/guards/jwt-auth.guard.ts`;
  - `server/src/modules/auth/auth.controller.ts` e `auth.service.ts`;
  - os controllers de alocações, lista de substituição e montagens (autor do log).
- Test: `jwt.strategy.spec.ts`, `jwt-auth.guard.spec.ts`, `auth.service.spec.ts`

**Interfaces — Produces:**

- `UsuarioAutenticado` ganha `paroquiaOrigemId?: string` e `implantacaoId?: string`.
- `JwtPayload.implantacaoId?: string`.
- **`validate()`:** se o payload tem `implantacaoId` e o vínculo está em `IMPLANTACAO` com
  `madrinhaId === usuario.paroquiaId`, devolve `{ ...usuario, paroquiaId: afilhadaId,
paroquiaOrigemId: usuario.paroquiaId, implantacaoId }`. Senão, ignora o campo e devolve a sessão
  normal da madrinha. Não lança erro; o guard reemite o cookie sem o campo.
- **Guard:** reemite o token incluindo `implantacaoId` quando `request.user.implantacaoId` existe.
- **`POST /auth/atuar { implantacaoId }`:** valida (PAROQUIA, madrinha, fase IMPLANTACAO), senão 403. Grava o cookie com o campo e devolve `me`.
- **`DELETE /auth/atuar`:** cookie sem o campo; devolve `me`.
- **`me`:** passa a devolver também
  `atuando: { implantacaoId, afilhada: { id, nome } } | null` e
  `podeAtuarEm: { implantacaoId, afilhada: { id, nome } }[]`. `paroquia` continua sendo a própria
  (a madrinha).
- **Bloqueios atuando:**
  - `POST /auth/alterar-senha` → 403;
  - `GET /implantacoes/minhas` e as rotas de liberação respondem como para a afilhada (sem vínculos);
    não precisam de código extra.
- **Autor do log:** nos controllers de alocações, lista de substituição e montagens, quando
  `req.user.paroquiaOrigemId` existe, o controller sobrescreve `dto.usuario` com
  `'Madrinha (atuando pela afilhada)'`. Sem atuação, mantém o comportamento atual.
  - **Desvio da spec, registrado:** a coluna `LogAtividade.paroquiaOrigemId` não é criada. O autor
    do log já é texto livre (`usuario`), e o client não envia autor hoje.

- [ ] **Step 1: Testes:**
  - `validate` com vínculo em IMPLANTACAO troca o `paroquiaId`;
  - **Review Focus 1:** com o vínculo em ACOMPANHAMENTO, devolve a madrinha sem lançar;
  - `atuar` com vínculo de outra madrinha → 403;
  - o guard mantém o `implantacaoId` no token renovado;
  - `alterarSenha` atuando → 403.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx jest`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(server): madrinha atua como afilhada durante a implantação`.

### Task 6: Candidatos e alocação entre paróquias

**Files:**

- Create: `server/src/modules/montagem/pessoas-elegiveis.ts`
- Modify: `pessoa-da-paroquia.ts`, `sugestoes-montagem.service.ts`, `fichas.service.ts` (histórico)
- Test: `pessoas-elegiveis.spec.ts`, `sugestoes-montagem.service.spec.ts`,
  `alocacoes.service.spec.ts`

**Interfaces — Produces:**

```ts
export interface Elegiveis {
  paroquiaIds: string[];
  liberadas: { fichaIds: string[]; fichaCasalIds: string[] };
}
export async function pessoasElegiveis(
  db: Prisma.TransactionClient,
  montagem: { paroquiaId: string; implantacaoId: string | null },
): Promise<Elegiveis>;
```

Tabela da spec:

- **Vínculo em IMPLANTACAO e `montagem.implantacaoId` igual a ele:** `[afilhada, madrinha]`.
- **Vínculo em ACOMPANHAMENTO com a montagem da afilhada:** `[afilhada]` mais as liberações.
- **Senão:** `[montagem.paroquiaId]`.

Usos:

- `garantirPessoaDaParoquia` passa a aceitar a ficha se
  `paroquiaId in elegiveis.paroquiaIds || id in liberadas`.
- `candidatosJovens`/`candidatosCasais` buscam com o mesmo filtro (OR) e devolvem
  `paroquiaOrigem: { id, nome }` em cada item.
- **R5:** no `sort`, uma ficha com `sementeiraDeId` conta como `numeroEncontro === 0`. Para a
  montagem 1, `encontroAnterior = 0`, então a sementeira vem primeiro.
- O histórico da ficha (`historicoEquipes`) inclui `montagem.paroquia.nome` e marca
  `outraParoquia: boolean` quando difere da paróquia da ficha.

- [ ] **Step 1: Testes:**
  - os quatro casos da tabela;
  - **Review Focus 3:** ficha da madrinha numa montagem 4 da afilhada durante IMPLANTACAO → 404 na
    alocação;
  - ficha liberada aceita em ACOMPANHAMENTO e recusada depois de ENCERRADA;
  - candidatos marcados com a origem;
  - sementeira ordenada primeiro na montagem 1.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx jest`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(server): candidatos e alocação entre madrinha e afilhada (exceção R7)`.

### Task 7: Montagem pelos anexos e Sementeira com quantidade

**Files:**

- Modify: `server/src/modules/montagem/montagens.service.ts`, `dto/create-montagem.dto.ts`,
  `dto/update-montagem.dto.ts`
- Test: `montagens.service.spec.ts`

**Interfaces:**

- **Consumes:** `ANEXOS` (Task 2).
- **Produces — DTO:**
  - `ehImplantacao`/`paroquiaAfilhadaNome` saem do DTO;
  - entram `recebeSementeira?: boolean`, `sementeiraDeImplantacaoId?: string` e
    `quantidadeJovensSementeira?: number` (`@Min(1) @Max(12)`, padrão 12).
- **Produces — `create`, encontro de implantação:** se a paróquia é afilhada de um vínculo em
  IMPLANTACAO e `numeroEncontro <= 3`:
  - as vagas vêm de `ANEXOS[numeroEncontro]`, com o cargo resolvido por `(equipe.slug, cargo.nome)`,
    `origem` e `quantidadeJovens`;
  - grava `implantacaoId` e `anexoImplantacao`;
  - `recebeSementeira` é proibido junto (400).
- **Produces — `create`, encontro normal:** segue como hoje.
- **Sementeira:**
  - vivenciando entre `40 + q` e `60 + q`, com `q = quantidadeJovensSementeira`;
  - Visitação `ceil((vivenciando − q) / 3) + 4`;
  - `sementeiraDeImplantacaoId` deve ser vínculo em SEMENTEIRA em que a paróquia é madrinha (senão
    404).
- **`update`:** recalcula a Visitação pela mesma fórmula. Em montagem com `anexoImplantacao`, **não**
  recalcula vagas.
- `buscarMontagemComVagas` já inclui `origem` e `quantidadeJovens` (são colunas).

- [ ] **Step 1: Testes:**
  - afilhada em IMPLANTACAO criando o encontro 1 → vagas do Anexo I: 232 pessoas, Visitação com 1
    casal MADRINHA e 20 AFILHADA;
  - afilhada criando o encontro 4 → vagas normais;
  - sementeira com `q = 10` aceita 50–70 e calcula a Visitação com os locais;
  - `q = 13` → 400;
  - sementeira com vínculo de outra madrinha → 404.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar. Remover as constantes `JOVENS_SEMENTEIRA_IMPLANTACAO` (vira padrão 12) e manter `CASAIS_AFILHADA_IMPLANTACAO = 4`.
- [ ] **Step 4:** `npx jest && npx tsc --noEmit -p tsconfig.json`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(server): encontros de implantação pelos anexos e sementeira com quantidade`.

### Task 8: Client — sessão, "Atuar como" e aviso fixo

**Files:**

- Modify: `client/lib/api/auth.ts`, `client/lib/auth-context.tsx`, `client/components/conta-menu.tsx`,
  `client/app/(app)/layout.tsx`
- Create: `client/components/atuando-banner.tsx`
- Test: `client/components/conta-menu.test.tsx`, `client/components/atuando-banner.test.tsx`

**Interfaces — Produces:**

- `SessaoAtual` ganha `atuando` e `podeAtuarEm` (formato do Task 5).
- `authApi.atuar(implantacaoId)` e `authApi.pararDeAtuar()`.
- Hook `useAtuar()`: mutation que, no sucesso, chama `queryClient.clear()` e navega para `/`.
- **ContaMenu:**
  - para cada `podeAtuarEm`, item "Atuar como {afilhada.nome}";
  - atuando, item "Voltar para {paroquia.nome}";
  - "Trocar senha" escondido atuando.
- **`AtuandoBanner`:** faixa no topo do conteúdo, `bg-ouro-suave text-ouro-foreground`, com o texto
  "Atuando como {afilhada.nome}" e o botão "Voltar para a minha paróquia". Só aparece com
  `atuando`.

- [ ] **Step 1: Testes:**
  - menu com `podeAtuarEm` mostra "Atuar como Paróquia X" e chama `atuar('i1')`;
  - atuando, mostra "Voltar para…" e não mostra "Trocar senha";
  - o banner aparece só atuando.
- [ ] **Step 2:** `npx vitest run components/conta-menu.test.tsx components/atuando-banner.test.tsx`.
      Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar de novo, mais `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(client): atuar como afilhada no menu da conta`.

### Task 9: Client — Conselho → Implantações

**Files:**

- Create: `client/app/(conselho)/conselho/implantacoes/page.tsx`,
  `client/components/conselho/nova-implantacao-dialog.tsx`, `client/lib/hooks/use-implantacoes.ts`
- Modify: `client/lib/api/conselho.ts`, `client/app/(conselho)/layout.tsx` (link "Implantações"),
  `client/app/(conselho)/conselho/page.tsx` (atalho)
- Test: `client/app/(conselho)/conselho/implantacoes/page.test.tsx`

**Interfaces — Consumes:** as rotas `conselho/implantacoes` do Task 3.

Tela:

- Lista: afilhada, madrinha, fase (badge `neutro`/`atencao`/`ouro`/`sucesso` para
  Sementeira/Implantação/Acompanhamento/Encerrada) e `MetaLista` com as datas.
- Ação da fase seguinte, sempre com diálogo de confirmação:
  - **"Iniciar implantação":** o diálogo mostra "N fichas de sementeira passam para {afilhada}".
  - **"Passar para acompanhamento"** e **"Encerrar":** o diálogo explica o efeito.
- **"Liberar acesso":** campo de e-mail; só aparece quando `!afilhadaTemConta` e a fase não é
  Sementeira.
- **Nova implantação:** nome da afilhada e madrinha (select das paróquias).

- [ ] **Step 1: Testes:**
  - lista renderiza fase e ação correta por fase;
  - o diálogo de iniciar mostra a contagem e chama `iniciar`;
  - "Liberar acesso" escondido com conta já criada.
- [ ] **Step 2–4:** Falhar, implementar e passar
      (`npx vitest run "app/(conselho)/conselho/implantacoes"`).
- [ ] **Step 5:** Commit `feat(client): tela de implantações do Conselho`.

### Task 10: Client — ficha (sementeira, liberação, histórico)

**Files:**

- Modify: `client/components/fichas/ficha-form/identificacao-section.tsx` (ou a seção do encontro),
  `client/lib/types.ts`, `client/components/fichas/historico-equipes-section.tsx`,
  `client/app/(app)/fichas/[id]/page.tsx`, `client/app/(app)/fichas/page.tsx`
- Create: `client/components/fichas/liberar-ficha-button.tsx`, hook em
  `client/lib/hooks/use-implantacoes.ts`
- Test: `historico-equipes-section` e `liberar-ficha-button` (Vitest)

Comportamento:

- **Formulário:** select opcional "Sementeira de", com os vínculos de `minhas` em fase Sementeira.
  Só aparece se houver algum.
- **Lista e detalhe:**
  - badge "Sementeira" mais a paróquia, por exemplo "Sementeira de Paróquia X";
  - na ficha transferida, o texto "Vivenciou como sementeira na Paróquia Y".
- **Histórico:** em item com `outraParoquia`, mostra o nome da paróquia do encontro.
- **Detalhe da ficha da madrinha**, com um vínculo em ACOMPANHAMENTO: botão "Liberar para
  {afilhada}" / "Desfazer liberação".

- [ ] **Steps 1–4:** testes (histórico mostra a paróquia quando `outraParoquia`; botão alterna
      liberar e desfazer), falhar, implementar, passar.
- [ ] **Step 5:** Commit `feat(client): sementeira e liberação na ficha`.

### Task 11: Client — montagem (origem das vagas e candidatos, sementeira)

**Files:**

- Modify:
  - `client/components/montagem/vaga-alocacoes.tsx`;
  - `client/components/montagem/aviso-badges.tsx`;
  - `client/components/montagem/alocar-pessoa-combobox.tsx`;
  - `client/components/montagem/pessoa-preview-popover.tsx`;
  - `client/components/montagem/nova-montagem-dialog.tsx`;
  - `client/components/montagem/editar-tamanho-encontro-dialog.tsx`;
  - `client/app/(app)/montagem/[id]/page.tsx`;
  - `client/lib/types.ts`;
  - `client/lib/montagem.ts` (`resumoEquipe` passa a somar `quantidadeJovens`).
- Test: `client/lib/montagem.test.ts`, `alocar-pessoa-combobox.test.tsx`, `vaga-alocacoes`

Comportamento:

- **Vaga com `origem`:** rótulo discreto "Madrinha" ou "Afilhada" ao lado do cargo.
- **Pessoa de outra origem na vaga:** badge `atencao` "Vaga da madrinha" (ou "Vaga da afilhada").
  A origem da pessoa é a `paroquiaOrigem` dela comparada com a madrinha e a afilhada da montagem.
- **Candidato de outra paróquia:** nome da paróquia no item do combobox e na prévia.
- **MetaLista do cabeçalho:** "Implantação: encontro N de 3" quando `anexoImplantacao`.
- **Diálogos:**
  - "Implantação" vira **"Recebe sementeira"**, com o select do vínculo e um campo de quantidade
    (1–12, padrão 12);
  - o texto de apoio explica a soma no total de jovens.

- [ ] **Steps 1–4:** testes (`resumoEquipe` com `quantidadeJovens`; combobox mostra a paróquia de
      origem; badge de origem divergente), falhar, implementar, passar.
- [ ] **Step 5:** Commit `feat(client): origem madrinha/afilhada na montagem e sementeira com quantidade`.

### Task 12: Regras, docs e E2E

**Files:**

- Modify:
  - `docs/regras-imutaveis.md` (R5, R6, R7, R8, com o texto da seção "Mudanças" da spec, datado de
    13/11/2026 como decisão do Lucas);
  - `docs/ux-e-fluxos.md` (fluxo de implantação e o caminho do caso real em andamento);
  - `docs/requisitos.md`, `CLAUDE.md` (estado atual), `server/CLAUDE.md` (rotas novas);
  - `server/prisma/seed-e2e.ts`.
- Create: `e2e/implantacao.spec.ts`

E2E:

1. O Conselho cria a implantação ("Paróquia E2E Afilhada", madrinha "Paróquia E2E").
2. A madrinha marca uma ficha como sementeira.
3. O Conselho inicia a implantação (o diálogo mostra 1 ficha).
4. A madrinha usa "Atuar como" e o banner aparece.
5. Ela cria o encontro 1: o quadro mostra a Visitação 0/21 e o rótulo "Afilhada" nas vagas.
6. Aloca a ficha transferida e uma ficha da madrinha.
7. "Voltar para a minha paróquia".

- [ ] **Step 1:** Escrever a spec E2E e o seed.
- [ ] **Step 2:** Rodar a suíte inteira:
  - server: `npx jest`, `npx eslint "{src,test}/**/*.ts"`, `npx tsc --noEmit -p tsconfig.json`;
  - client: `npx vitest run`, `npx eslint .`, `npx tsc --noEmit`, `npm run build`;
  - E2E: `npm run test:e2e` com o servidor de dev parado, ou deixar para o CI se a porta estiver
    ocupada, registrando no ledger.

  Expected: tudo verde.

- [ ] **Step 3:** Docs.
- [ ] **Step 4:** Commit `docs: regras e fluxos da implantação; e2e do fluxo completo`.
