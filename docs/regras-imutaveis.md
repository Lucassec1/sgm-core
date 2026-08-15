# SGM Core — Regras Imutáveis

> Este documento existe pra ser lido **junto com qualquer prompt de IA** que for gerar código, telas ou lógica de negócio. As regras aqui não são negociáveis nem interpretáveis — o sistema pode **avisar**, mas nunca pode **permitir** uma ação que viole uma delas, a menos que a própria regra abra exceção explícita.

---

## R1 — Recusa ou desistência do convite

- Quem recusa o convite ou desiste durante a montagem **não pode servir nesse encontro**.
- Só pode ser convidada de novo **no encontro seguinte**.
- O sistema **bloqueia** a inserção dessa pessoa em qualquer equipe do encontro atual após o registro da recusa/desistência (bloqueio real, não só aviso).

## R2 — Repetição de equipe

- Uma pessoa pode servir na mesma equipe mais de uma vez, mas o ideal é não repetir.
- O sistema exibe um **aviso explícito** (não bloqueia) ao tentar inserir alguém que já serviu naquela equipe — exige confirmação consciente do usuário pra prosseguir.
- **Limite: ninguém pode servir na mesma equipe mais de 3 vezes.** O sistema bloqueia a inserção ao atingir esse limite.
- **Exceção — Eq. da Visitação:** essa equipe é de alta demanda (poucos casais disponíveis para o volume de vagas), e na prática o limite de 3x nem sempre é seguido à risca ali. Pra essa equipe especificamente, o aviso continua aparecendo, mas **não bloqueia** — fica a critério da equipe dirigente decidir. Para as outras 15 equipes, o bloqueio de 3x é real.

## R3 — Coordenação de equipe

- Só pode coordenar uma equipe quem **já serviu como equipista naquela equipe específica**.
- **Exceção:** quem já foi Equipe Dirigente ou Comando Geral pode coordenar **qualquer** equipe.
- Na sugestão de coordenadores, o sistema separa dois grupos:
  - **Grupo A** (destaque, origem preferencial): já serviu como equipista naquela equipe.
  - **Grupo B** (alternativa): foi Equipe Dirigente/Comando Geral.
- Quem não se encaixa em nenhum dos dois grupos **não aparece como opção de coordenador** — é bloqueio, não aviso.

## R4 — Prioridade da Eq. dos Círculos

- A Eq. dos Círculos é sempre a **primeira** a ser convidada, antes de qualquer outra equipe.
- As demais 14 equipes (fora Comando Geral) só podem ser convidadas depois que **todos** os membros dos Círculos tiverem aceitado o convite.

## R5 — Prioridade de convite entre jovens

1. 1º: jovens que vivenciaram o encontro **imediatamente anterior** (ex.: para o VI, prioridade dos jovens do V).
2. 2º: jovens de encontros anteriores a esse.
- Fichas **inativas** não entram nas sugestões de montagem.

## R6 — Tamanho e composição do encontro

- O encontro conta com **233 pessoas** no total nas 16 equipes + Comando Geral, **mais o diretor espiritual** (que não é contabilizado dentro da soma das 16 equipes).
- Número de jovens vivenciando: **mínimo 40, máximo 60**, ou **até 72 em caso de sementeira** — mas esse número **não precisa fechar exatamente** 60 ou 72 (ex.: pode dar 62), inclusive por causa de desistências de última hora.
- **Eq. da Visitação — tamanho variável (não é uma tabela fixa de 42/50):** a proporção é de aproximadamente **1 casal para cada 3 jovens vivenciando**, com distribuição não uniforme quando o número não é múltiplo de 3 (ex.: para 40 jovens, ~14 casais — a maioria levando 3, alguns levando 2 ou 1). O sistema deve calcular esse número **dinamicamente** a partir do total de jovens vivenciando informado, não buscar em uma tabela fixa.

## R7 — Escala e isolamento entre paróquias

- O sistema atende múltiplas paróquias da diocese de Crato (estimativa: **13 paróquias**).
- Cada paróquia tem sua **própria equipe dirigente** (login próprio) — ou seja, existem 13 equipes dirigentes ao todo, uma por paróquia, sob supervisão do conselho diocesano.
- Dados de fichas e montagem de uma paróquia **não são visíveis** para outra paróquia — exceto para o Conselho, que tem visão geral (funcionalidade futura).
- A lógica de negócio (todas as regras deste documento) é **idêntica** para todas as paróquias.

## R8 — Conselho (funcionalidade futura, não é escopo da v1)

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

| Onde o documento original dizia | Está corrigido para |
|---|---|
| Conselho: "13 contas no total" | 12 contas (8 jovens + 4 casais) — o "13" era erro de digitação, confundido com as 13 paróquias |
| Eq. da Sala: soma dos cargos batia 14, cabeçalho dizia 16 | Bate 16 — há um casal que coordena além do que estava listado |
| Total de 233 participantes não batia com a soma das 16 equipes (dava 232) | O total de 233 inclui o diretor espiritual, que não é contado dentro da soma das 16 equipes |
| Eq. da Visitação com tamanho fixo (42 ou 50) | Tamanho variável, proporcional (~1 casal : 3 jovens), calculado dinamicamente |
