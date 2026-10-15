# SGM Core — Regras Imutáveis

> Este documento existe pra ser lido **junto com qualquer prompt de IA** que for gerar código, telas ou lógica de negócio. As regras aqui não são negociáveis nem interpretáveis — o sistema pode **avisar**, mas nunca pode **permitir** uma ação que viole uma delas, a menos que a própria regra abra exceção explícita.
>
> **Exceção explícita — R1 a R4 (decisão da equipe dirigente, 14/10/2026):** essas quatro são regras do Segue-me que o sistema **informa e pede confirmação**, mas **não bloqueia** — quem decide é a equipe dirigente, que conhece o contexto (ex.: falta de gente, encontro já realizado sendo registrado). O aviso é obrigatório: o sistema nunca deixa passar uma dessas situações em silêncio. **Não reintroduzir bloqueio** nessas quatro sem nova decisão registrada aqui. As demais regras (R5 em diante) continuam valendo como antes.

---

## R1 — Recusa ou desistência do convite

- Quem recusa o convite ou desiste durante a montagem, em princípio, **não serve nesse encontro** — o costume é convidar de novo só no encontro seguinte.
- O sistema **avisa** ("recusou o convite deste encontro", com o motivo) e pede confirmação ao colocar essa pessoa de novo em qualquer equipe do encontro atual. **Não bloqueia** (exceção explícita, ver topo).
- Na busca de pessoa pra vaga, quem recusou aparece no fim da lista, marcado.

## R2 — Repetição de equipe

- Uma pessoa pode servir na mesma equipe mais de uma vez, mas o ideal é não repetir.
- O sistema exibe um **aviso explícito** ao tentar inserir alguém que já serviu naquela equipe — exige confirmação consciente do usuário pra prosseguir.
- **Limite de referência: 3 vezes na mesma equipe.** Da 4ª vez em diante o aviso é **grave** (destacado em vermelho, "esta seria a 4ª vez") — mas **não bloqueia** (exceção explícita, ver topo). Vale igual pras 16 equipes, inclusive a Visitação.
- Serviço feito em outra paróquia (ex.: na paróquia madrinha, durante a implantação) também conta.

## R3 — Coordenação de equipe

- **Coordenação por jovem:** o esperado é que coordene uma equipe quem **já serviu como equipista naquela equipe específica**.
  - **Exceção:** quem já foi Equipe Dirigente ou Comando Geral pode coordenar **qualquer** equipe.
  - Na sugestão de coordenadores, o sistema separa três grupos:
    - **Grupo A** (destaque, origem preferencial): já serviu como equipista naquela equipe — dentro dele, primeiro quem foi **avaliado como "pode coordenar"** naquela equipe.
    - **Grupo B** (alternativa): foi Equipe Dirigente/Comando Geral.
    - **Outras pessoas:** aparecem no fim, marcadas "nunca serviu nesta equipe". Escolher alguém daqui gera aviso **grave** e pede confirmação — mas **não bloqueia** (exceção explícita, ver topo).
  - Serviço feito em outra paróquia (ex.: na paróquia madrinha) também conta pro Grupo A.
- **Coordenação por casal:** a regra acima (Grupo A/B) **não se aplica** — qualquer casal ativo pode coordenar qualquer equipe, sem precisar de histórico ali.
  - **Exceção — Eq. da Visitação:** por ter muitos casais (proporção alta pra sustentar a demanda de vagas, ver R6), os coordenadores de lá tradicionalmente sempre vêm de quem já serviu na própria equipe. Por isso, só pra essa equipe, a coordenação por casal segue a mesma regra de Grupo A/B da coordenação por jovem (histórico na equipe OU Equipe Dirigente/Comando Geral).

## R4 — Prioridade da Eq. dos Círculos

- A Eq. dos Círculos é sempre a **primeira** a ser convidada, antes de qualquer outra equipe.
- O costume é convidar as demais 14 equipes (fora Comando Geral) só depois que **todos** os membros dos Círculos tiverem aceitado o convite.
- Convidar antes disso gera **aviso** e pede confirmação — **não bloqueia** (exceção explícita, ver topo). A montagem/rascunho das outras equipes nunca foi travada; o aviso é só sobre **enviar o convite**.

## R5 — Prioridade de convite entre jovens

1. 1º: jovens que vivenciaram o encontro **imediatamente anterior** (ex.: para o VI, prioridade dos jovens do V).
2. 2º: jovens de encontros anteriores a esse.

- Fichas **inativas** não entram nas sugestões de montagem.

## R6 — Tamanho e composição do encontro

- O encontro conta com **233 pessoas** no total nas 16 equipes + Comando Geral, **mais o diretor espiritual** (que não é contabilizado dentro da soma das 16 equipes).
- Número de jovens vivenciando **locais**: **mínimo 40, máximo 60** — não precisa fechar exatamente 60, inclusive por causa de desistências de última hora.
- **Eq. da Visitação — tamanho variável (não é uma tabela fixa de 42/50):** a proporção é de aproximadamente **1 casal para cada 3 jovens vivenciando locais**, com distribuição não uniforme quando o número não é múltiplo de 3 (ex.: para 40 jovens, ~14 casais — a maioria levando 3, alguns levando 2 ou 1). O sistema deve calcular esse número **dinamicamente** a partir do total de jovens vivenciando informado, não buscar em uma tabela fixa.
- **Implantação** — encontro que lança o Segue-me numa **paróquia afilhada**. Quando marcada:
  - Soma-se **12 jovens "sementeira"** vindos da paróquia afilhada aos jovens locais (mínimo 40, máximo 60) — total do encontro entre 52 e 72 jovens. Esses 12 são fixos, não digitados livremente.
  - A Eq. da Visitação ganha **4 casais fixos da paróquia afilhada**, somados ao cálculo proporcional de casais locais (que continua sendo ~1 casal para cada 3 jovens **locais**, sem contar os 12 sementeira). Ex.: 60 jovens locais + 12 sementeira = 72 total → 20 casais locais (60/3) + 4 afilhados = 24 casais no total da Visitação.
  - O sistema deve permitir marcar/desmarcar Implantação numa Montagem a qualquer momento (não só na criação) e recalcular a Visitação de acordo, já que o número final de jovens vivenciando costuma só fechar depois que o encontro já foi montado.

## R7 — Escala e isolamento entre paróquias

- O sistema atende múltiplas paróquias da diocese de Crato (estimativa: **13 paróquias**).
- Cada paróquia tem sua **própria equipe dirigente** (login próprio) — ou seja, existem 13 equipes dirigentes ao todo, uma por paróquia, sob supervisão do conselho diocesano.
- Dados de fichas e montagem de uma paróquia **não são visíveis** para outra paróquia — exceto para o Conselho, que tem visão geral (implementado — ver R8).
- A lógica de negócio (todas as regras deste documento) é **idêntica** para todas as paróquias.

## R8 — Conselho (implementado em set/2026)

- **12 contas no total**: 8 jovens do conselho (1 conta cada) + 4 casais do conselho (1 conta por casal).
- Acesso **somente leitura**: visualizar a montagem em andamento em tempo real e as montagens finalizadas de qualquer paróquia.
- Pode deixar observações na montagem de cada paróquia — toda observação exibe o nome de quem a registrou.
- **Não tem acesso às fichas**, apenas à montagem.

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
