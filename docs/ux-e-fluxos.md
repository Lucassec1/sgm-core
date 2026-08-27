# SGM Core — UX & Fluxos

> Camada derivada do `requisitos.md`. Aqui ficam as decisões de *como* o sistema se comporta — não as regras do Segue-me, que continuam imutáveis no documento de requisitos.

---

## 1. Fluxos do Usuário

### 1.1 Fluxo — Cadastro de Ficha

```
Dashboard
   │
   ▼
Lista de Fichas ──(busca/filtro)──> encontra a pessoa? ──sim──> Ficha existente
   │
   não
   ▼
Nova Ficha
   │
   ▼
Identificação → Endereço → Filiação → Escolaridade → Religião → Convite
   │  (cada seção salva sozinha — auto-save, sem "próximo/anterior" obrigatório)
   ▼
Ficha salva → aparece na Lista de Fichas
```

**Decisão tomada:** seções empilhadas uma abaixo da outra, separadas por divider — não Wizard e não Tabs. As seções são independentes entre si (editar Religião não exige ter preenchido Escolaridade), e a equipe dirigente frequentemente volta só para atualizar uma seção específica. Wizard força sequência e trava edição parcial. Tabs escondem conteúdo atrás de clique — na prática a equipe dirigente escaneia a ficha inteira de uma vez, então tudo visível numa rolagem só (com divider entre as seções) funciona melhor.

### 1.2 Fluxo — Criação da Montagem

```
Dashboard
   │
   ▼
Nova Montagem
   │
   ▼
Dados do encontro (nº automático, data, paróquia, diretor espiritual,
padroeiro, sementeira, nº de jovens vivenciando)
   │
   ▼
Quadro das 16 Equipes (todas as vagas em aberto)
   │
   ▼
Convidar Eq. dos Círculos (obrigatoriamente primeiro — regra do Segue-me)
   │      (em paralelo: já dá pra rascunhar a distribuição das outras 14 equipes,
   │       só não dá pra enviar convite delas ainda)
   ▼
Todos os Círculos aceitaram? ──não──> aguarda / substitui
   │
  sim
   ▼
Convite das demais 14 equipes liberado
   │
   ▼
Controle de Convites (aceitos/recusados/substituições)
   │
   ▼
Montagem 100% preenchida
   │
   ▼
Exportar (.xlsx) + Visualizar no Histórico
```

**Ponto de atenção:** a Eq. dos Círculos bloqueando as demais é a única dependência sequencial dentro da montagem, mas o bloqueio é só sobre **enviar o convite** — a equipe dirigente já rascunha/distribui as outras 14 equipes em paralelo, na prática é assim que costuma acontecer. A ação de "Convidar" de cada equipe fica desabilitada com um tooltip explicando o motivo, em vez do card inteiro travado.

---

## 2. UX Specification — Módulo Fichas

### Ficha do Jovem/Casal

**Organização**
- **Seções empilhadas com divider**, não Wizard nem Tabs (decisão acima).
- Página de detalhe, de cima pra baixo: **header** (foto grande + nome + badge de situação; no Jovem também badge da cor do círculo e nº do encontro) → **Histórico de Equipes** → **Dados cadastrais** (o formulário). Divider entre cada bloco.
- Ordem das seções dentro de Dados cadastrais: Identificação → Endereço → Filiação → Escolaridade → Religião → Convite. Cada seção com um subtítulo discreto e um divider entre elas. Histórico não é seção do formulário — vem antes, logo abaixo do header.
- No cadastro novo (sem header de página) a foto aparece no topo do próprio formulário; na edição ela fica só no header.
- Campos lado a lado: tudo que é curto e correlato (Data de nascimento + Naturalidade; Telefone + E-mail; Logradouro + Número). Largura total: campos de texto livre (Observações, motivo de desativação) e Endereço completo em telas estreitas.
- Histórico: **não** Accordion — sugiro **Table** (uma linha por equipe servida: nº do encontro, equipe, pode coordenar?, pode palestrar?, observações). Accordion esconde informação que a equipe dirigente frequentemente precisa escanear rápido (ex.: "quantas vezes já serviu nos Círculos?").
- Avaliação: embutida na mesma linha da Table de Histórico (não em Timeline separada) — evita alternar entre duas visualizações pra responder "essa pessoa pode coordenar essa equipe?".
- Foto: à esquerda, ao lado do nome, sempre visível (não dentro de uma aba) — é o principal ponto de reconhecimento visual na montagem.

**Produtividade**
- **Decidido:** vale investir, porque não é só um mutirão pontual — a carga inicial é pesada (cadastro retroativo dos últimos 6 encontros) e depois passa a ser um fluxo recorrente (ano a ano). Isso muda a solução: em vez de só um formulário "rápido" na UI, dois modos:
  - **Cadastro sequencial rápido**: atalho de teclado pra pular pro próximo campo, e a tela já abre pronta pra próxima ficha depois de salvar (sem voltar pra Lista a cada pessoa) — bom para o fluxo recorrente ano a ano.
  - **Importação em massa via planilha (CSV/Excel)**: para a carga retroativa dos 6 encontros, digitar um por um ainda é lento demais mesmo com atalhos. Sugiro um importador que aceita uma planilha com os campos principais (nome, telefone, encontro, cor do círculo, equipe(s) que serviu) e cria as fichas de uma vez, com uma tela de conferência antes de confirmar (mostrando o que vai ser criado, avisando duplicatas prováveis por nome). Ficha entra como rascunho — os campos que faltarem (religião, filiação etc.) são completados depois, sem bloquear a carga inicial.
- Autocomplete sugerido em: Naturalidade, Igreja que frequenta, Instituição de ensino (campos que se repetem entre pessoas da mesma região/paróquia).
- Select (não busca livre) para: Grau de escolaridade, Situação, Religião, Número do encontro, Cor do círculo — são listas fechadas e curtas.
- Busca (não Select) para: nome de quem convidou, nome do pai/mãe — texto livre, sem lista fixa.
- Chips: participação em outros movimentos da Igreja (pode ser mais de um).

**Fluxo**
- Auto-save por campo (on blur) ou por aba (ao trocar de Tab) — evita perda de dados sem exigir clique manual, mas também evita salvar campo por campo em excesso.
- Validação: **on blur**, não em tempo real a cada tecla (validar CPF/telefone enquanto a pessoa ainda está digitando é irritante); validação de obrigatoriedade só ao tentar sair da aba ou salvar a ficha.
- **Decidido:** sim, ficha pode ficar como "rascunho". Além de evitar perda de dado no cadastro do dia a dia, isso é essencial pro cenário de importação em massa (ficha entra incompleta e alguém completa depois) e pro fluxo ano a ano, onde fichas antigas frequentemente precisam de correção/atualização — "rascunho" e "editar depois" são, na prática, o mesmo mecanismo.

### Lista de Fichas

- Filtros: busca por nome (texto livre) + Select por nº de encontro + Select por status (Ativa/Inativa) — o requisito só pede busca por nome e encontro, mas filtrar por status também é necessário pra quem quer revisar fichas inativas.
- Destaque visual: nome do encontro anterior com indicativo de cor do círculo (regra do documento), aplicado como uma bolinha colorida ao lado do nome + texto da cor — mais legível que pintar o próprio texto do nome na cor (algumas cores do círculo têm baixo contraste em texto, ex. amarelo).

### Responsividade

- **Decidido:** foco em desktop/notebook. A quantidade de informação por tela (fichas, tabelas de montagem) não cabe bem em celular, e não vale complicar o design por um uso secundário. A Lista de Fichas e o Quadro de Equipes usam layout de Table/grid cheio, pensado pra tela larga.
- Mínimo a suportar: 1366×768 (notebook comum).
- Não é prioridade, mas como a base é Tailwind/shadcn (responsivo por padrão), o sistema deve pelo menos **não quebrar visualmente** em celular (texto legível, sem sobreposição) — só não vale otimizar a experiência para lá.

---

## 3. UX Specification — Módulo Montagem

### Estrutura das 16 equipes

**Decisão sugerida:** grid de **Cards** (estilo Kanban, sem colunas de status — cada card É uma equipe), não Accordion nem Tree View.
- Accordion não escala bem pra 16 itens simultâneos (vira lista de cliques).
- Tree View sugere hierarquia entre equipes, que não existe (elas são paralelas, exceto a dependência dos Círculos).
- Cada card mostra: nome da equipe, % preenchido (Progress), vagas restantes por função/gênero, e badge se a equipe está bloqueada aguardando Círculos.
- Clicar no card abre um **Drawer** lateral com a distribuição completa daquela equipe — mantém a visão geral das 16 sempre visível atrás do drawer.

### Distribuição — o que aparece ao selecionar uma pessoa

O requisito original pede: nome completo, endereço, telefone. Sugiro adicionar:
- **Quantas vezes já serviu** (no total e nessa equipe específica) — direto relevante pra regra R2 (limite de 3x)
- **Círculo/cor** (se for do último encontro)
- **Nº do encontro** que vivenciou
- **Foto** (reconhecimento rápido)
- **Decidido:** nem inline total, nem só um badge — um meio-termo. Ao selecionar/passar o mouse sobre a pessoa na busca, abre um **Popover** (card flutuante, sem sair da tela de montagem) com: foto, nome, telefone, quantas vezes serviu, círculo/encontro, e o resumo da avaliação (pode coordenar? pode palestrar? + últimas observações). Isso cobre o "quero visitar brevemente o perfil" sem interromper o fluxo de montagem. Se precisar de mais detalhe (ex.: ver o histórico completo de avaliações), um link "Ver ficha completa" dentro do próprio Popover abre a ficha de verdade.

Isso evita abrir a ficha completa toda hora durante a montagem, que era exatamente o objetivo que você levantou.

### Lista de substituição (geral, não por vaga)

Novo recurso: uma lista **geral** de pessoas cotadas como boas opções de substituição, independente de qual equipe. Não fica presa a uma vaga específica — é um "banco de backups" da montagem como um todo, que a equipe dirigente consulta sempre que alguém sai de qualquer equipe. O motivo de alguém entrar nessa lista pode ser prático (já serviu bem em várias equipes, perfil versátil) ou só preferência da equipe dirigente por aquele encontro — o sistema não precisa diferenciar o motivo.

- Um espaço próprio dentro da Montagem (ex.: uma aba/seção "Substituições" ao lado do Quadro de Equipes), com uma lista de pessoas + uma nota opcional do porquê ("já serviu em 3 equipes diferentes", "disponibilidade confirmada", etc.).
- Quando alguém sai de **qualquer** equipe (recusa/desistência, regra R1), a equipe dirigente consulta essa lista geral primeiro, antes de cair na busca genérica por prioridade.
- A lista é por montagem/encontro — não carrega automaticamente de um encontro pro outro (a equipe dirigente decide de novo a cada encontro quem entra nela).

### Alertas visuais

| Situação | Sugestão visual |
|---|---|
| Já serviu nessa equipe antes | Badge outline amarelo, ⚠️ "já serviu em [encontro]" |
| Não pode coordenar | Badge vermelho discreto, some se não for uma vaga de coordenação |
| Recusou convite | Badge vermelho sólido "Recusou", card esmaecido/riscado |
| Do último encontro (prioridade) | Badge com a cor do círculo — mesma badge usada na Lista de Fichas, por consistência |
| Está na lista geral de substituição | Pequeno ícone de "estrela" no card/linha da pessoa em qualquer lugar do sistema |
| Equipe dos Círculos ainda não fechou | Aviso discreto no topo do Quadro de Equipes (não bloqueia as outras equipes — ver nota abaixo) |

**Sobre o bloqueio dos Círculos (R4):** a regra em si não mudou — convite formal pras outras 14 equipes só sai depois dos Círculos fecharem. Mas isso não deve travar a **tela**: a equipe dirigente pode ir montando/rascunhando a distribuição das outras equipes em paralelo (é assim que funciona na prática), só não consegue **enviar convite** delas antes dos Círculos fecharem. Ou seja: card de equipe nunca fica "cadeado" — o que muda é só a ação de convidar, que fica desabilitada com uma explicação (tooltip: "Aguardando Eq. dos Círculos") até lá.

### Busca de pessoa para preencher vaga

- Combobox com busca por nome, já filtrando automaticamente por: fichas Ativas, sexo compatível com a vaga, e priorizando (não escondendo) quem é do encontro anterior.
- **Decidido:** aviso em tempo real, mas **não-bloqueante** — nada de Alert Dialog pedindo confirmação aqui (isso eu reservaria só pras regras R1-R3, que são de fato imutáveis). Proposta:
  - Na busca, a pessoa já alocada aparece com uma badge discreta ao lado do nome: "Já em: Eq. Cozinha" — informação visível, mas não impede selecionar/mover.
  - Ao confirmar a nova alocação, o sistema move automaticamente (tira da equipe antiga, coloca na nova) e mostra um Toast: "João movido de Eq. Cozinha para Eq. Sala — Desfazer". Sem modal, sem clique de confirmação — só a opção de reverter caso tenha sido engano.
  - Como só existe uma montagem ativa por vez, esse remanejamento é sempre dentro do encontro atual — não há cenário de mover entre encontros diferentes.
  - Esse comportamento cobre exatamente o caso comum: jovem está na Eq. X e a equipe dirigente decide trocar pra Eq. Y na hora (ex.: descobriram que tem um irmão/familiar na equipe Y e faz mais sentido juntar, ou simplesmente precisam de alguém ali naquele momento). Não é uma exceção — é o fluxo normal de remanejamento, por isso ele tem que ser leve e sem fricção.

---

## 4. Design System — mapa de uso (shadcn)

| Necessidade do sistema | Componente shadcn |
|---|---|
| Navegação geral (Fichas / Montagem / Exportação) | Sidebar |
| Seções da Ficha do Jovem/Casal | Separator (empilhadas, sem Tabs) |
| Grid das 16 equipes | Card + Progress + Badge |
| Detalhe de uma equipe ao clicar no card | Drawer |
| Confirmações obrigatórias (repetição de equipe, recusa) | Alert Dialog |
| Criação de nova montagem/ficha | Dialog |
| Busca de pessoa para vaga | Command (combobox com busca) |
| Lista de substituição (banco geral de backups da montagem) | DataTable ou List + Command para adicionar pessoas |
| Lista de Fichas, Histórico de equipes, Controle de Convites | DataTable |
| Status (Ativa/Inativa, Aceito/Recusado, cor do círculo) | Badge |
| Foto da pessoa | Avatar |
| Auto-save, confirmações de ação | Toast |
| % de preenchimento da montagem | Progress |
| Upload de PDF (Quadrantes) | (sem componente shadcn nativo — construir com input file + lista) |

---

## Observações fechadas

- Só existe uma montagem ativa por vez (um encontro de cada vez) — por isso o remanejamento com Toast + Desfazer da seção de Montagem só precisa considerar o encontro atual, sem cenário de mover entre encontros diferentes.
- Reforçando a regra R3 (coordenação), que já estava no documento de requisitos: uma pessoa só pode ser sugerida como **coordenadora** de uma equipe se (a) já serviu como equipista **naquela equipe específica**, ou (b) já foi Equipe Dirigente/Comando Geral (pode coordenar qualquer equipe nesse caso). Quem nunca serviu na equipe e nunca foi Equipe Dirigente/Comando Geral **não aparece** como opção de coordenador — não é só um aviso, é bloqueio mesmo, igual o resto das regras R1-R3.
