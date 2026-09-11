
# Propostas de evolução — SGM Core

Ideias de design e funcionalidade pra evoluir o protótipo, lidas depois de revisar
`docs/requisitos.md`, `docs/ux-e-fluxos.md` e `docs/design-system.md` — que já são bem completos.
Por isso, o critério aqui foi: **só sugerir o que ainda não está decidido** nesses documentos.
Nada abaixo contradiz uma decisão já tomada; são adições.

Cada proposta tem uma seção "por que isso e não outra coisa" — mesmo padrão de raciocínio que
`ux-e-fluxos.md` já usa, pra ficar fácil de comparar com o que você já decidiu antes de aceitar
ou descartar.

---

## 1. Paleta de comando global (⌘K)

**O que:** um command palette (Ctrl+K / ⌘K, abre de qualquer tela) que busca fichas, casais,
equipes e montagens por nome, e lista ações rápidas ("Nova Ficha", "Nova Montagem",
"Ir pra Montagem em andamento"). Resultado abre direto na página, sem passar pela Sidebar.

**Por que isso e não outra coisa:** `cmdk` já é dependência do projeto e o componente `Command`
já existe (`components/ui/command.tsx`) — hoje usado só localmente, no combobox de busca de
pessoa pra vaga. É a mesma peça, só exposta globalmente. Isso estende uma decisão que você já
tomou (produtividade importa: atalhos de teclado, fluxo sequencial sem voltar pra lista) pro
resto do sistema, sem introduzir um padrão novo de UI.

**Esforço:** baixo — um listener de teclado no layout raiz + reaproveitar o `Command` existente
com os endpoints de busca que já existem (`listFichas`, `listFichasCasais`, `listMontagens`).

**Status (11/09/2026): implementado.** `components/command-palette.tsx`, botão "Buscar ⌘K" no
header + atalho global (`⌘K`/`Ctrl+K` de qualquer tela). Busca fichas (jovens) e casais por
nome via API (debounce de 200ms, a partir de 2 caracteres) e montagens por número do encontro
(lista local, filtrada aqui — a API não tem busca por nome de montagem). Ações rápidas: Nova
Ficha, Novo Casal, Ver Quadro de Equipes, e "Ir para Montagem em andamento" (só aparece
quando existe uma). **Diferença do escopo original:** não busca "equipes" — as 16 equipes não
têm rota própria (só aparecem dentro do drawer de uma Montagem específica), então não haveria
pra onde navegar num resultado de equipe isolado.

---

## 2. Painel "como foi esse encontro" a partir do Log de Atividade

**O que:** ao finalizar uma Montagem, uma tela de resumo: tempo entre criação e 100%
preenchida, qual equipe demorou mais pra fechar, quantas recusas/substituições aconteceram,
comparado com os últimos encontros da mesma paróquia.

**Por que isso e não outra coisa:** o `LogAtividade` (R9) já grava usuário, ação e timestamp de
toda mudança na Montagem — o dado inteiro já existe, granular, desde a primeira linha de código
do módulo. Hoje ele só alimenta uma lista crua (`listarLog`). Virar esses números em 4-5
métricas simples é praticamente só leitura + agregação — não pede nenhum schema novo, e devolve
uma pergunta que a equipe dirigente provavelmente já se faz de cabeça hoje ("esse encontro foi
mais difícil de montar que o passado, ou foi impressão minha?").

**Esforço:** baixo-médio — uma query agregando `LogAtividade` por `montagemId` e um card de
resumo na tela de Montagem finalizada.

---

## 3. Indicador de presença na tela de Montagem

**O que:** avatares pequenos no topo do Quadro de 16 Equipes mostrando quem mais da equipe
dirigente está com aquela Montagem aberta agora (tipo Figma/Linear/Google Docs).

**Por que isso e não outra coisa:** os próprios fluxos que você desenhou (`ux-e-fluxos.md`,
seção 3) descrevem remanejamento e distribuição acontecendo com mais de uma pessoa mexendo ao
mesmo tempo — é o comportamento normal, não uma exceção. Isso é exatamente o cenário em que "o
outro coordenador também está olhando essa mesma pessoa agora" ajuda a evitar dois convites
conflitantes sem que ninguém perceba na hora. É um complemento direto de UX pra algo que a
revisão de código já também apontou como ponto de atenção técnico (checagens de regra sem lock
no banco) — a presença não resolve a corrida no banco, mas reduz a chance de ela acontecer na
prática, porque as pessoas se veem.

**Esforço:** médio — pede um canal de tempo real (WebSocket/SSE ou polling curto) que o projeto
ainda não tem; é a proposta mais cara da lista, mas também a de maior efeito percebido no dia
em que várias pessoas usam ao mesmo tempo.

---

## 4. Upload de foto (3x4) — simples, com opção de lote pra carga retroativa

**O que:** trocar o campo `fotoUrl` (hoje só texto) por upload de imagem de verdade —
`input type="file"`, aceitando a foto 3x4 já existente da pessoa (escaneada ou fotografada), com
armazenamento próprio em vez de depender de colar um link externo. Junto disso, uma opção de
**upload em lote**: subir uma pasta inteira de fotos de uma vez e vincular cada arquivo à ficha
certa pelo nome do arquivo, no mesmo fluxo do importador CSV já planejado pra carga retroativa.

**Por que isso e não outra coisa:** o próprio `CLAUDE.md` já lista "falta upload real de foto
(hoje é só campo de URL)" como pendência conhecida. A foto é o 3x4 padrão que a pessoa já tem
pronto — não um retrato tirado na hora — então não faz sentido um fluxo de captura ao vivo pela
câmera (cogitado numa versão anterior desta proposta, mas descartado: sem propósito quando a foto
já existe pronta e enquadrada). O ganho real está em não depender de hospedar a imagem em outro
lugar e colar a URL, e em cobrir a carga retroativa dos últimos 6 encontros — cadastro em massa
sem foto nenhuma anexada seria um resultado capenga.

**Esforço:** baixo-médio — precisa de armazenamento de imagem (hoje o projeto não tem nenhum; um
bucket S3-compatible tipo Cloudflare R2/Backblaze resolve bem pro volume) e, pro upload em lote,
um passo de conferência que casa cada arquivo com a ficha certa antes de confirmar (mesmo padrão
de tela de conferência que `ux-e-fluxos.md` já propõe pro importador CSV).

---

## 5. Modo telão / modo impressão pro Quadro de Equipes

**O que:** uma visão somente-leitura do Quadro de Equipes, grande e sem dado sensível (só nome +
equipe + função — sem telefone/endereço), pensada pra projetar num telão do salão ou imprimir e
colar no mural no dia do encontro.

**Por que isso e não outra coisa:** o próprio domínio já lida bastante com o mundo físico do
encontro — Quadrantes impressos pela Eq. da Gráfica, 233 pessoas presencialmente, exportação em
`.xlsx` prevista justamente pra sair da tela. O sistema hoje é pensado só pra tela de notebook da
equipe dirigente (decisão registrada e correta); esta proposta não muda isso — é uma segunda
visão, derivada da mesma Montagem, só pro momento em que a informação precisa sair do notebook e
chegar pra todo mundo do encontro de uma vez.

**Esforço:** baixo — reaproveita os dados que o Quadro já busca, só uma rota `/montagem/[id]/telao`
com CSS de impressão/projeção e filtro dos campos sensíveis.

---

## 6. Cache de leitura pra internet instável no fim de semana do encontro

**O que:** um Service Worker simples (PWA básico) que mantém o Quadro de Equipes e a Distribuição
visíveis — só leitura — se a conexão cair por alguns minutos durante o encontro. Escrita continua
bloqueada até a conexão voltar (evita o mesmo tipo de risco de escrita concorrente sem rede que
já apareceu na revisão de código).

**Por que isso e não outra coisa:** isso não é um problema hipotético pra você — é literalmente o
mesmo problema que a Lojinha da Romaria já resolveu (SQLite local + funcionamento 100% offline,
porque a internet do local do evento é ruim). O Segue-me também acontece num local físico único,
durante um fim de semana inteiro, com a Montagem sendo consultada o tempo todo ao vivo — é
razoável esperar Wi-Fi instável na mesma medida. Não estou sugerindo repetir a solução da
Lojinha (lá o requisito era mais extremo: PDV sem internet nenhuma) — aqui um cache de leitura já
cobre o cenário mais comum, que é "a tela continuar mostrando o que já tinha carregado" em vez de
travar numa tela de erro no meio da distribuição das equipes.

**Esforço:** médio — Service Worker com cache das últimas respostas da API + uma barra de aviso
"sem conexão — mostrando última versão sincronizada".

---

## 7. Dark mode

**O que:** tema escuro, alternável (ou seguindo o SO), usando os mesmos tokens shadcn que o
projeto já usa.

**Por que isso e não outra coisa:** é o item mais barato da lista e o único puramente de conforto
— mas o contexto de uso real (um fim de semana inteiro de tela, incluindo período noturno do
encontro, provavelmente num salão com pouca luz) torna isso mais que estético. shadcn/Tailwind já
tem suporte nativo a dark mode via CSS variables — a base de tokens que `design-system.md` já
define (zinc/neutral) migra praticamente sem retrabalho de design, só precisa das variantes
`dark:` e um toggle.

**Esforço:** baixo.

**Status (07/09/2026): implementado.** `next-themes` + classe `.dark`, tokens escuros em `app/globals.css`,
`darkMode: ['class']` no Tailwind. Botão no header (`components/theme-toggle.tsx`) cicla claro → escuro →
automático. `Toaster` (sonner) segue o tema. Badges de status e caixas de aviso âmbar ganharam variante
`dark:`; badge de círculo não precisou mudar. Pendência menor: texto de erro dos formulários (`text-red-600`)
ainda sem variante `dark:` — registrado em `docs/design-system.md`.

---

## Resumo — o que eu testaria primeiro

Se eu tivesse que escolher uma pra prototipar primeiro: **#1 (Command Palette)**, porque é a mais
barata, não depende de nada que o projeto ainda não tem (sem storage novo, sem canal
tempo-real), e reforça uma decisão de produto que você já tomou (produtividade da equipe
dirigente importa de verdade). As demais dependem de peças de infraestrutura que ainda não
existem (upload de imagem, tempo real, service worker) — vale sequenciar depois de decidir se
valem o esforço.
