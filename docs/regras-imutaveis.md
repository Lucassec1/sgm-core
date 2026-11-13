# SGM Core — Regras Imutáveis

> Este documento existe pra ser lido **junto com qualquer prompt de IA** que for gerar código, telas ou lógica de negócio. As regras aqui não são negociáveis nem interpretáveis — o sistema pode **avisar**, mas nunca pode **permitir** uma ação que viole uma delas, a menos que a própria regra abra exceção explícita.
>
> **Exceção explícita — R1 a R4 (decisão da equipe dirigente, 14/10/2026):** essas quatro são regras do Segue-me que o sistema **informa**, mas **não bloqueia** — quem decide é a equipe dirigente, que conhece o contexto (ex.: falta de gente, encontro já realizado sendo registrado). O aviso é obrigatório: o sistema nunca deixa passar uma dessas situações em silêncio. **R1–R3 viram badges** (na busca de pessoa, antes de escolher, e na pessoa já alocada — vaga, Lista completa, aba Convites), sem pedir confirmação. **Só R4 pede confirmação**, porque "Convidar" dispara convite pra várias pessoas de uma vez. **Não reintroduzir bloqueio** nessas quatro sem nova decisão registrada aqui. As demais regras (R5 em diante) continuam valendo como antes.

---

## R1 — Recusa ou desistência do convite

- Quem recusa o convite ou desiste durante a montagem, em princípio, **não serve nesse encontro** — o costume é convidar de novo só no encontro seguinte.
- O sistema **avisa** com a badge "Recusou este encontro" — na busca de pessoa (onde quem recusou aparece no fim da lista) e na pessoa alocada, se ela for chamada de novo. **Não bloqueia nem pede confirmação** (exceção explícita, ver topo).

## R2 — Repetição de equipe

- Uma pessoa pode servir na mesma equipe mais de uma vez, mas o ideal é não repetir.
- O sistema mostra a badge "Nª vez nesta equipe" pra quem já serviu naquela equipe — na busca, antes de escolher, e na pessoa alocada. Âmbar na 2ª e 3ª vez.
- **Limite de referência: 3 vezes na mesma equipe.** Da 4ª vez em diante a badge é **vermelha** — mas **não bloqueia nem pede confirmação** (exceção explícita, ver topo). Vale igual pras 16 equipes, inclusive a Visitação.
- Serviço feito em outra paróquia (ex.: na paróquia madrinha, durante a implantação) também conta.

## R3 — Coordenação de equipe

- **Coordenação por jovem:** o esperado é que coordene uma equipe quem **já serviu como equipista naquela equipe específica**.
  - **Exceção:** quem já foi Equipe Dirigente ou Comando Geral pode coordenar **qualquer** equipe.
  - Na sugestão de coordenadores, o sistema separa três grupos:
    - **Grupo A** (destaque, origem preferencial): já serviu como equipista naquela equipe — dentro dele, primeiro quem foi **avaliado como "pode coordenar"** naquela equipe.
    - **Grupo B** (alternativa): foi Equipe Dirigente/Comando Geral.
    - **Outras pessoas:** aparecem no fim, com a badge vermelha "Nunca serviu nesta equipe", que continua na pessoa depois de alocada — **não bloqueia nem pede confirmação** (exceção explícita, ver topo).
  - Serviço feito em outra paróquia (ex.: na paróquia madrinha) também conta pro Grupo A.
- **Coordenação por casal:** a regra acima (Grupo A/B) **não se aplica** — qualquer casal ativo pode coordenar qualquer equipe, sem precisar de histórico ali.
  - **Exceção — Eq. da Visitação:** por ter muitos casais (proporção alta pra sustentar a demanda de vagas, ver R6), os coordenadores de lá tradicionalmente sempre vêm de quem já serviu na própria equipe. Por isso, só pra essa equipe, a coordenação por casal segue a mesma regra de Grupo A/B da coordenação por jovem (histórico na equipe OU Equipe Dirigente/Comando Geral).

## R4 — Prioridade da Eq. dos Círculos

- A Eq. dos Círculos é sempre a **primeira** a ser convidada, antes de qualquer outra equipe.
- O costume é convidar as demais 14 equipes (fora Comando Geral) só depois que **todos** os membros dos Círculos tiverem aceitado o convite.
- Convidar antes disso gera **aviso** e **pede confirmação** (única das quatro que pede, por disparar convite em lote) — **não bloqueia** (exceção explícita, ver topo). A montagem/rascunho das outras equipes nunca foi travada; o aviso é só sobre **enviar o convite**.

## R5 — Prioridade de convite entre jovens

1. 1º: jovens que vivenciaram o encontro **imediatamente anterior** (ex.: para o VI, prioridade dos jovens do V).
2. 2º: jovens de encontros anteriores a esse.

- Fichas **inativas** não entram nas sugestões de montagem.
- **Sementeira** (implantação, decisão do Lucas em 13/11/2026): o jovem da afilhada que vivenciou o
  encontro na paróquia madrinha conta como **anterior ao I encontro** da afilhada — o número do
  encontro da madrinha não se mistura com a numeração da afilhada.

## R6 — Tamanho e composição do encontro

- O encontro conta com **233 pessoas** no total nas 16 equipes + Comando Geral, **mais o diretor espiritual** (que não é contabilizado dentro da soma das 16 equipes).
- Número de jovens vivenciando **locais**: **mínimo 40, máximo 60** — não precisa fechar exatamente 60, inclusive por causa de desistências de última hora.
- **Eq. da Visitação — tamanho variável (não é uma tabela fixa de 42/50):** a proporção é de aproximadamente **1 casal para cada 3 jovens vivenciando locais**, com distribuição não uniforme quando o número não é múltiplo de 3 (ex.: para 40 jovens, ~14 casais — a maioria levando 3, alguns levando 2 ou 1). O sistema deve calcular esse número **dinamicamente** a partir do total de jovens vivenciando informado, não buscar em uma tabela fixa.
- **Sementeira** e **Implantação** são coisas diferentes (norma em `docs/implantacao.md`; corrigido
  por decisão do Lucas em 13/11/2026 — antes o sistema chamava de "Implantação" o que é Sementeira):
  - **Sementeira** — encontro **da madrinha** que recebe jovens de uma paróquia afilhada (Art. 14).
    Quando marcado ("Recebe sementeira"):
    - Somam-se os **jovens da sementeira** aos locais (mínimo 40, máximo 60 locais): **12 por
      padrão**, informável de **1 a 12** (pode ser menos por desistência). Total do encontro entre
      40 + sementeira e 60 + sementeira.
    - A Eq. da Visitação ganha **4 casais fixos da paróquia afilhada**, somados ao cálculo
      proporcional de casais locais (~1 casal para cada 3 jovens **locais**, sem contar a
      sementeira). Ex.: 60 locais + 12 sementeira = 72 → 20 casais locais + 4 = 24 casais.
    - Pode ser marcado/desmarcado a qualquer momento e a Visitação é recalculada.
  - **Implantação** — os **3 primeiros encontros da afilhada** (Art. 19–21). Com o vínculo em fase
    de Implantação, os encontros 1, 2 e 3 da afilhada nascem com as vagas dos **Anexos I, II e III**
    (232 pessoas cada), divididas por origem (madrinha/afilhada). A Visitação segue o anexo (1 casal
    da madrinha + 20 da afilhada), não o cálculo proporcional; o nº de jovens vivenciando continua
    informado (40 a 60). A origem da vaga **só orienta** — ocupar a vaga da outra paróquia gera
    aviso, não bloqueia (Art. 21, parágrafo único). Encontro de implantação não recebe sementeira.

## R7 — Escala e isolamento entre paróquias

- O sistema atende múltiplas paróquias da diocese de Crato (estimativa: **13 paróquias**).
- Cada paróquia tem sua **própria equipe dirigente** (login próprio) — ou seja, existem 13 equipes dirigentes ao todo, uma por paróquia, sob supervisão do conselho diocesano.
- Dados de fichas e montagem de uma paróquia **não são visíveis** para outra paróquia — exceto para o Conselho, que tem visão geral (implementado — ver R8).
- **Exceção com prazo: implantação** (decisão do Lucas em 13/11/2026), só enquanto existir o vínculo
  madrinha → afilhada criado pelo Conselho:
  - **Sementeira:** a madrinha marca as fichas dos jovens da afilhada que vivenciam com ela. Ao
    iniciar a implantação, essas fichas **passam a ser da afilhada**.
  - **Implantação** (encontros I a III): a madrinha pode **atuar como afilhada** (mesmas telas, a
    sessão opera a afilhada; conferido a cada requisição) e, nos encontros de anexo, as fichas das
    **duas paróquias** são candidatas. A afilhada só ganha conta de acesso para o II encontro.
  - **Acompanhamento** (depois do III, só a afilhada controla): a madrinha não atua mais; só as
    fichas que ela **liberar** aparecem nas montagens da afilhada.
  - **Encerrada** (só o Conselho encerra): isolamento total, como entre quaisquer paróquias.
  - Fora da busca de candidatos e da alocação, a outra paróquia nunca vê lista nem detalhe de ficha.
- A lógica de negócio (todas as regras deste documento) é **idêntica** para todas as paróquias.

## R8 — Conselho (implementado em set/2026)

- **12 contas no total**: 8 jovens do conselho (1 conta cada) + 4 casais do conselho (1 conta por casal).
- Acesso **somente leitura**: visualizar a montagem em andamento em tempo real e as montagens finalizadas de qualquer paróquia.
- Pode deixar observações na montagem de cada paróquia — toda observação exibe o nome de quem a registrou.
- **Não tem acesso às fichas**, apenas à montagem.
- **Conduz as implantações** (decisão do Lucas em 13/11/2026): cria o vínculo madrinha → afilhada
  (a afilhada nasce sem conta), avança as fases (Sementeira → Implantação → Acompanhamento →
  Encerrada, só para frente), libera o acesso da afilhada e encerra. Da sementeira vê só a
  **contagem** de fichas, nunca as fichas.

## R9 — Auto-save e integridade de dados

- Qualquer alteração na montagem é salva automaticamente — nenhum dado deve se perder por falta de salvamento manual.
- Log de atividade obrigatório: toda alteração na montagem registra usuário, ação realizada e data/hora.
- Histórico de substituições do encontro atual fica visível **apenas enquanto a montagem não é finalizada** — depois de finalizada, esse histórico some (ser substituto num encontro não deve influenciar o próximo).

---

## Correções registradas em relação ao documento de requisitos original (v1.0)

O documento original tinha algumas inconsistências numéricas que foram esclarecidas em conversa com o Lucas — as regras acima já refletem a versão corrigida:

| Onde o documento original dizia                                           | Está corrigido para                                                                            |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Conselho: "13 contas no total"                                            | 12 contas (8 jovens + 4 casais) — o "13" era erro de digitação, confundido com as 13 paróquias |
| Eq. da Sala: soma dos cargos batia 14, cabeçalho dizia 16                 | Bate 16 — há um casal que coordena além do que estava listado                                  |
| Total de 233 participantes não batia com a soma das 16 equipes (dava 232) | O total de 233 inclui o diretor espiritual, que não é contado dentro da soma das 16 equipes    |
| Eq. da Visitação com tamanho fixo (42 ou 50)                              | Tamanho variável, proporcional (~1 casal : 3 jovens), calculado dinamicamente                  |
