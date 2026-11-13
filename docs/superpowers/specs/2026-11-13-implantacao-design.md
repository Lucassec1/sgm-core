# Implantação conduzida pelo Conselho — design

Data: 13/11/2026 · Branch: `feat/implantacao` · Norma: `docs/implantacao.md` (Documento 01/CNS)

## Objetivo

O Conselho registra o vínculo **paróquia madrinha → paróquia afilhada** e acompanha suas fases. O
sistema monta os 3 encontros de implantação da afilhada com as vagas dos Anexos I, II e III da norma,
divididas por origem (madrinha/afilhada). Assim, a montagem respeita a norma sem conferência manual
da tabela, e as peças hoje soltas (#63, #79, #80, #81) passam a ser um fluxo só.

## Decisões do Lucas (brainstorming de 12–13/11/2026)

1. A montagem de implantação é **feita pelas duas paróquias**. A autonomia vai passando da madrinha
   para a afilhada ao longo dos encontros: no I, a afilhada mandou os nomes e a madrinha distribuiu.
2. A origem da vaga **só orienta, não trava**. Cobre a madrinha ajudando a afilhada e o Art. 21,
   parágrafo único (seguidores da afilhada ocupando vagas da madrinha).
3. As pessoas da afilhada entram com **ficha de verdade**. Os jovens que vivenciaram na madrinha
   (sementeira) são cadastrados pela madrinha e marcados como sementeira da paróquia X. Quando a
   implantação começa, essas fichas passam a ser da afilhada; ela só cadastra os jovens novos e os
   casais.
4. O vínculo é registrado **já na sementeira**. A afilhada só recebe **conta de acesso para o II
   encontro**, quando sua equipe dirigente é formada.
5. Abordagem **A — "Atuar como afilhada"**: a conta da madrinha opera a afilhada pelas mesmas telas
   de sempre, enquanto o vínculo permitir. Quem controla o vínculo é o **Conselho**.
6. Depois do III encontro o acesso **não cai sozinho**: o Conselho passa para Acompanhamento
   (controle só da afilhada) e só ele encerra.
7. No Acompanhamento, a madrinha **libera fichas específicas** para a afilhada usar ("um jovem aqui e
   ali"). A afilhada não vê o resto da madrinha.
8. A opção "Implantação" de hoje passa a se chamar **Sementeira**. Ela tem **12 jovens por
   encontro** como padrão, editável para menos (desistências), e a sementeira costuma ter dois
   encontros de 12.

## Fases do vínculo

Só o Conselho muda de fase. As fases andam só para frente.

| Fase               | O que acontece                                          | Madrinha                                 | Afilhada                        |
| ------------------ | ------------------------------------------------------- | ---------------------------------------- | ------------------------------- |
| **Sementeira**     | Jovens da afilhada vivenciam nos encontros da madrinha  | Marca fichas como "sementeira de X"      | Existe, sem conta de acesso     |
| **Implantação**    | Encontros I, II e III da afilhada, com vagas dos anexos | Atua como afilhada (fichas e montagem)   | Ganha conta para o II (passo 3) |
| **Acompanhamento** | Depois do III; a afilhada assume                        | Não atua mais; só libera fichas pontuais | Controle total                  |
| **Encerrada**      | Vínculo histórico                                       | Sem relação; a R7 vale integralmente     | Paróquia comum                  |

Ações do Conselho, na tela nova **Conselho → Implantações**:

1. **Criar** (fase Sementeira): nome da paróquia afilhada (criada aqui, **sem e-mail/conta**) e
   escolha da madrinha entre as paróquias existentes.
2. **Iniciar implantação**: confirma mostrando **quantas** fichas marcadas como sementeira serão
   transferidas (só a contagem — o Conselho não vê fichas, R8). As fichas mudam de `paroquiaId`
   numa transação, e a transferência entra no log.
3. **Liberar acesso da afilhada**: o fluxo que já existe, de cadastrar o e-mail da paróquia e enviar
   o link de primeiro acesso. Pode ser feito em qualquer fase a partir de Implantação.
4. **Passar para Acompanhamento** e, depois, **Encerrar**.

Limites:

- Madrinha ≠ afilhada.
- Uma paróquia é afilhada em no máximo **um** vínculo não encerrado.
- Uma madrinha pode ter vários vínculos.
- A afilhada não pode ser madrinha de outro vínculo enquanto o seu não estiver encerrado.

## Modelo de dados

- **`Implantacao`** (nova):
  - `id`, `madrinhaId`, `afilhadaId`, `fase` (`SEMENTEIRA | IMPLANTACAO | ACOMPANHAMENTO | ENCERRADA`);
  - `criadaPorId` (usuário do Conselho);
  - `createdAt`, `implantacaoIniciadaEm`, `acompanhamentoIniciadoEm`, `encerradaEm`.
- **`Paroquia`**: passa a poder existir sem usuário. O e-mail deixa de ser obrigatório na criação
  feita pelo vínculo; o cadastro de paróquia avulsa continua igual.
- **`Ficha`** (jovem): `sementeiraDeId → Implantacao?`.
  - A madrinha marca e desmarca enquanto a fase é Sementeira.
  - Depois da transferência, o campo continua preenchido e identifica a ficha como sementeira (#79).
- **`LiberacaoFicha`** (nova): `implantacaoId`, `fichaId?` ou `fichaCasalId?` (exatamente um),
  `createdAt`. Criada e removida pela madrinha na fase Acompanhamento.
- **`Montagem`**:
  - `implantacaoId?` + `anexoImplantacao Int?` (1, 2 ou 3): encontro de implantação da afilhada.
  - `ehImplantacao` → **`recebeSementeira`**. É o encontro da madrinha que recebe jovens da afilhada.
  - `paroquiaAfilhadaNome` → **`sementeiraDeImplantacaoId?`**. O texto antigo é preservado em
    montagens já existentes (migração mantém o valor numa coluna legada só de exibição).
  - `quantidadeJovensSementeira`: padrão 12, editável de 1 a 12.
  - `quantidadeCasaisAfilhada`: continua 4 fixo.
- **`VagaMontagem`**:
  - `origem?` (`MADRINHA | AFILHADA`), preenchida só em encontros de implantação.
  - `quantidadeJovens Int @default(0)`: jovens **sem sexo definido**, para as linhas do anexo que dizem
    "N jovens" sem dividir rapazes e moças.
- **`LogAtividade`**: `paroquiaOrigemId?`, preenchido quando a ação foi feita por uma madrinha
  atuando como afilhada.

## Atuar como afilhada

- **Onde aparece:** o menu da conta da madrinha mostra **"Atuar como Paróquia X (afilhada)"**
  enquanto houver vínculo na fase Implantação.
- **Endpoint `POST /auth/atuar` `{ implantacaoId }`:** reemite a sessão com `paroquiaId = afilhada`,
  `paroquiaOrigemId = madrinha` e `implantacaoId`.
- **Endpoint `DELETE /auth/atuar`:** volta a sessão para a madrinha.
- **Guards:** todos os guards e serviços continuam usando `paroquiaId` da sessão, sem mudança por
  endpoint.
- **Conferência a cada requisição:** quando a sessão tem `implantacaoId`, o servidor confere se o
  vínculo segue em fase Implantação e se a madrinha é a paróquia de origem. Se não seguir, responde
  401 com um código próprio, e o client volta para a madrinha.
- **Aviso fixo no topo:** "Atuando como Paróquia X", com o botão "Voltar para a minha paróquia".
- **Log:** registra a origem, por exemplo "Paróquia Y (atuando pela afilhada)".
- **Ações bloqueadas atuando:** gestão de conta (trocar senha, e-mail) e gestão de vínculo.

## Candidatos e alocação entre paróquias

Busca de candidatos numa montagem da afilhada:

| Fase do vínculo | Candidatos                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Implantação     | Fichas da afilhada **e da madrinha** (só nas montagens com `anexoImplantacao`), com marca de origem |
| Acompanhamento  | Fichas da afilhada + fichas com `LiberacaoFicha` desse vínculo                                      |
| Encerrada/sem   | Só fichas da afilhada (como hoje)                                                                   |

- Vale para quem estiver montando: a madrinha atuando ou a afilhada logada (no II e III ela também vê
  as fichas da madrinha nessa busca).
- A alocação aceita uma ficha de outra paróquia **só** nessas condições. Fora delas, a resposta
  continua sendo "não encontrado", como a R7 já faz hoje.
- **Fichas da outra paróquia** aparecem só com os dados da prévia já existente (nome, foto,
  encontro, círculo, histórico resumido). A lista de fichas e o detalhe da ficha continuam isolados.
- **Origem diferente da vaga**: badge de aviso, por exemplo "Vaga da madrinha", sem bloquear (como as
  R1 a R3).
- **R2/R3:** usam o histórico inteiro da pessoa, em qualquer paróquia. O serviço de uma ficha da
  madrinha num encontro da afilhada aparece no histórico dela como "Eq. X — I Encontro da Paróquia
  X". Isso cobre a #80 nesse caso.
- **Ficha transferida:** mostra a vivência como "Vivenciou no XVI Encontro da Paróquia Y
  (sementeira)", sem abrir a montagem da madrinha.

## Montagem pelos anexos

- **Tabela dos anexos:** fica em `server/src/modules/implantacao/anexos.ts`. Cada linha tem equipe
  (slug), cargo (nome existente: Comandantes Gerais, Comandantes Jovens, Coordenação, Apoio,
  Componentes), origem e quantidades `casais / rapazes / moças / jovens`.
- **Divisão por sexo:** "1 rapaz e 1 moça" vira rapazes/moças. "N jovens" sem divisão vira
  `jovens`.
- **Criação do encontro:** criar uma montagem na afilhada com `numeroEncontro` 1, 2 ou 3, com o
  vínculo em fase Implantação, gera as vagas do anexo correspondente (uma `VagaMontagem` por
  equipe + cargo + origem) e grava `implantacaoId` e `anexoImplantacao`. Fora disso, a criação segue
  o padrão normal.
- **Teste de transcrição:** cada anexo é conferido contra o RESUMO da própria norma:

  | Anexo | Madrinha (jovens / casais / pessoas) | Afilhada (jovens / casais / pessoas) | Total |
  | ----- | ------------------------------------ | ------------------------------------ | ----- |
  | I     | 108 / 18 / 144                       | 22 / 33 / 88                         | 232   |
  | II    | 52 / 17 / 86                         | 78 / 34 / 146                        | 232   |
  | III   | 28 / 1 / 30                          | 102 / 50 / 202                       | 232   |

  Se a soma das linhas transcritas não bater com o RESUMO por causa de erro no próprio documento,
  **não** ajusto por conta: a divergência vai para o Lucas decidir, e a decisão fica registrada.

- **Regras no encontro de implantação:**
  - R1 a R5 valem normalmente (R4: Círculos primeiro).
  - R5: ficha com `sementeiraDeId` conta como anterior ao I encontro.
  - R6: `numeroJovensVivenciando` continua informado, de 40 a 60. A Visitação **segue o anexo**
    (1 casal da madrinha e 20 da afilhada), sem o cálculo de 1 casal para cada 3 jovens.
- **Ajuste manual das vagas:** continua possível (Art. 21, "de acordo com entendimento dos
  responsáveis") e entra no log.

## Sementeira (encontro da madrinha)

- A opção na criação/edição da montagem passa a se chamar **"Recebe sementeira"**.
- **Vínculo:** escolhe-se o vínculo em fase Sementeira em que a paróquia é madrinha ("Sementeira de:
  Paróquia X").
- **Jovens:** quantidade padrão 12, editável de 1 a 12. A soma ao total de jovens vivenciando usa
  essa quantidade, e não o 12 fixo.
- **Visitação:** continua com os 4 casais da afilhada somados ao cálculo de 1 casal para cada 3
  jovens **locais**.
- **Montagens antigas:** se tinham "implantação" marcada, viram "recebe sementeira" com o nome
  digitado preservado.

## Mudanças em `docs/regras-imutaveis.md` (decisões do Lucas)

- **R6:** separar **Sementeira** (encontro da madrinha; até 12 jovens por encontro, padrão 12, mais
  4 casais na Visitação) de **Implantação** (os 3 encontros da afilhada, com vagas dos Anexos I–III e
  Visitação pelo anexo).
- **R7:** exceção com prazo, só enquanto houver vínculo:
  - **Implantação:** a madrinha atua como afilhada, e as fichas das duas são candidatas nos encontros
    de implantação.
  - **Acompanhamento:** só as fichas liberadas pela madrinha.
  - **Encerrada:** isolamento total.
- **R8:** o Conselho também cria e conduz vínculos de implantação (criar, mudar de fase, liberar
  acesso, encerrar). Continua sem acesso a fichas e só com leitura da montagem.
- **R5:** sementeira conta como anterior ao I encontro.
- **#63:** a regra da madrinha fica decidida por este documento e fecha junto.

## Fora de escopo

- Implantação entre (arqui)dioceses (Art. 4º); o sistema atende uma diocese.
- Quadrante com as equipes dirigentes das duas paróquias (Art. 24): os quadrantes continuam sendo
  PDF anexado.
- Finanças, pós-encontros, palestrantes e reuniões (Art. 6º e 7º).
- Pessoa de fora sem ficha (#81) para outros casos: continua no backlog, mas deixa de ser necessária
  para a implantação.
- Exportação (#58).

## Produção

- Migration renomeia colunas e preserva dados de `ehImplantacao` e `paroquiaAfilhadaNome`; cria
  tabelas e colunas novas, todas opcionais ou com padrão.
- Precisa rodar no Neon antes do server novo (`docs/deploy.md`, seção 4).
- **Caso real em andamento:** a paróquia do Lucas é madrinha, e o I encontro de implantação está
  acontecendo agora. O caminho para registrá-lo (criar o vínculo, marcar as 24 fichas, iniciar a
  implantação e montar o I) fica descrito no PR e no `docs/ux-e-fluxos.md`.

## Testes

- **Server (Jest):**
  - transições de fase permitidas e proibidas;
  - limites do vínculo;
  - transferência das fichas na transação;
  - Conselho recebendo só a contagem;
  - `atuar` concedido e negado por fase e por paróquia;
  - sessão de atuação derrubada quando a fase muda;
  - candidatos por fase;
  - alocação de ficha de outra paróquia aceita e negada;
  - geração de vagas por anexo e a conferência com o RESUMO;
  - Visitação pelo anexo;
  - sementeira com quantidade editável;
  - R5 com sementeira.
- **Client (Vitest):** menu "Atuar como" e aviso fixo; tela de Implantações do Conselho; badge
  "Vaga da madrinha/afilhada"; marca de sementeira na ficha.
- **E2E:** o fluxo Conselho cria o vínculo → madrinha marca a sementeira → Conselho inicia → madrinha
  atua e monta o I encontro com uma ficha de cada paróquia.

## Issues afetadas

- **Fecha:** #63 (regra da madrinha) e #79 (marca de sementeira).
- **Cobre em parte:** #80 (serviço em outra paróquia, quando os dois encontros estão no sistema) e
  #81 (deixa de ser necessária para a implantação).
