# SGM Core — o que falta pra ser um produto de verdade

Avaliação de engenharia sênior, com foco em um cenário específico: o sistema precisa sobreviver com o
mínimo de contato técnico contínuo depois que Lucas sair da equipe dirigente (ED) este ano — especialmente
no que envolve dados.

Versão navegável: https://claude.ai/code/artifact/8a60c06d-25cd-4fed-91ca-45276629a233

Data: 14/09/2026

## Veredito

A pergunta certa não é "o código está bom o suficiente" — já está, pro que se propõe. A pergunta é "o que
acontece no dia em que ninguém técnico está olhando e algo dá errado". Hoje a resposta é: **o sistema
inteiro para, sem aviso, sem backup e sem ninguém autorizado a saber o que aconteceu.** É isso que essa
lista resolve, na ordem em que resolve.

**Antes dos problemas, o que já está resolvido de verdade:** as duas revisões anteriores confirmaram R1-R9
corretas e testadas, transação `Serializable` nas regras de concorrência, build e lint limpos nos dois
lados, CORS configurável, Swagger, e 6 das 7 propostas de evolução já no ar. Isso não é pouco — a maioria
dos gaps abaixo não é "o código está errado", é "o código está sozinho no mundo, sem rede de segurança ao
redor dele".

---

## Bloqueadores — resolver antes de sair da ED

Não são "boas práticas" genéricas. São as quatro coisas que, se ninguém mexer, vão dar errado de um jeito
que ninguém vai saber consertar depois — e duas delas (privacidade e hospedagem) são decisões que só alguém
com a autoridade/contexto atual do Lucas consegue destravar.

### 1. Não existe backup do banco de dados — nem hospedagem real

Hoje o sistema roda só via `docker-compose up`, local. Não existe servidor, domínio ou backup automático em
lugar nenhum do projeto (confirmado no código: nenhum Fly/Railway/Render/Terraform, nenhuma menção a backup
do Postgres) — e confirmado com o Lucas que é assim mesmo. Isso significa: se o disco de quem estiver
rodando o container corromper, ou o notebook for formatado, ou o HD morrer, **o cadastro de centenas de
pessoas — nome, contato, histórico de anos de encontros — some sem chance de recuperação.** Esse é,
disparado, o maior risco de tudo: é o único item irreversível se acontecer.

- **O que fazer:** mover o Postgres pra um provedor gerenciado com backup automático incluído (Neon,
  Supabase, Railway e Render têm isso de fábrica, com tier gratuito ou bem barato pro volume de uma
  paróquia). Isso sozinho resolve a maior parte do risco sem exigir que alguém opere backup manualmente.
- **Quem decide:** o Lucas, agora — é decisão de "onde isso vai morar", não de código. Depois de escolhido,
  a migração é trabalho técnico normal (poucas horas).

### 2. Consentimento já existe no papel; falta garantir que cobre o uso digital

Correção do Lucas: o Segue-me já entrega um termo ao jovem na inscrição em papel — ele toma ciência antes
do cadastro, e pai/responsável assina no lugar dele quando é menor de idade. Isso resolve a parte que mais
pesava aqui: **o consentimento em si já existe**, como processo institucional, antes mesmo do sistema
entrar em cena. A Ficha continua coletando dado sensível (religião, sacramentos — LGPD art. 5º, II) de
gente menor de idade (LGPD art. 14), então o cuidado continua válido — só que agora é sobre fechar duas
pontas específicas, não sobre criar um processo do zero.

- **O que verificar:** se o texto do termo já em uso menciona que os dados serão digitalizados/armazenados
  num sistema como o SGM Core (quem acessa, por quanto tempo) — um termo pensado só pra "inscrição no
  encontro" pode não cobrir isso explicitamente. Vale uma linha a mais, revisada por alguém da coordenação,
  não uma reescrita.
- **O que adicionar no sistema:** um campo simples na Ficha — algo como `termoAssinado` (sim/não) + data —
  pra que o registro digital reflita que o termo em papel foi coletado. Importa puramente pra sucessão: sem
  esse campo, a prova do consentimento vive só no arquivo físico, que um sucessor sem o contexto do Lucas
  pode nem saber que existe.

### 3. Autenticação — RESOLVIDO (14-15/09/2026)

Implementado: login JWT (cookie httpOnly) por credencial de paróquia (compartilhada, como uma
conta de Drive — decisão consciente, ver trade-off abaixo) + guard global (`JwtAuthGuard`) +
isolamento real entre paróquias (`ParoquiaScopeGuard`/`MontagemScopeGuard`, R7) + Conselho
implementado de verdade (R8: leitura cross-paróquia da Montagem, observações atribuídas por
nome, gestão de credenciais de paróquia) — ver `server/CLAUDE.md` pro padrão de guard/rota.

Isso significa que a decisão antiga de "manter multi-paróquia/Conselho fora de escopo" (ver
`CLAUDE.md`, seção "Isolamento por paróquia") **foi revertida**: R7 e R8 estão implementados e
testados (96 testes de backend), não é mais um "não é prioridade agora".

**Trade-off aceito conscientemente:** login de paróquia é uma credencial compartilhada, não uma
conta por pessoa da equipe dirigente — então o campo `usuario` do log de atividade (R9)
continua sendo texto livre digitado na tela, não uma identidade verificada. Resolve o problema
de acesso (ninguém de fora entra mais sem credencial), não resolve rastreabilidade individual
dentro de uma mesma paróquia. Se isso vier a importar, a mudança é login individual por pessoa
— hoje deliberadamente fora de escopo.

### 4. Ninguém não-técnico consegue tirar os dados do sistema sozinho

A exportação `.xlsx` segue "em breve" (confirmado no dashboard e no `CLAUDE.md`). Combinado com o item 1
(sem backup automático), hoje não existe nenhum jeito de alguém da equipe dirigente, sem saber mexer em
banco de dados, conseguir um retrato dos dados por conta própria.

- **O que fazer:** não precisa ser a exportação completa planejada originalmente — uma exportação simples
  (fichas + montagem atual em CSV/Excel, um botão só) já cobre o essencial.
- **Esforço:** baixo-médio — menor do que parece, principalmente numa versão simples.

---

## Importantes — pra ser levado a sério como produto

Não quebram nada sozinhos, mas separam "projeto de um estudante" de "sistema que uma instituição usa".
Todos são trabalho técnico — nenhum pede decisão institucional.

- **Checklist de hardening ainda em aberto.** Helmet, rate limiting e logger estruturado continuam
  ausentes. Sem eles, um erro em produção não deixa rastro pra investigar, e não há barreira contra abuso
  básico.
- **16 vulnerabilidades conhecidas em dependências do server (7 altas).** `npm audit` aponta `multer`,
  `mysql2` (transitivo, nem usado) e `qs`. `npm audit fix` sem `--force` resolve uma parte de graça; o
  resto pede um upgrade maior do NestJS.
- **Cobertura de teste ainda concentrada só no módulo Montagem.** `FichasController`, o fluxo completo de
  `FichasCasais`, upload/remoção de foto e Quadrantes não têm teste automatizado. Vale garantir que o que
  mais gente vai mexer no dia a dia (cadastro de ficha) tenha rede de segurança tão boa quanto a Montagem.
- **Formatação de código não é automática.** Sem Prettier, `.editorconfig` ou Husky/lint-staged em nenhum
  dos dois pacotes — só as regras de estilo do ESLint. Importa mais, não menos, quando mais de uma pessoa
  (ou uma IA) for tocar o código sem revisão constante.
- **Nenhum jeito de saber que o sistema caiu, a não ser alguém reclamar.** Sem health check endpoint nem
  rastreamento de erro (Sentry ou similar).

---

## Polimento e sucessão

Não impedem nada hoje, mas são exatamente sobre sobreviver com o mínimo de contato técnico contínuo.

- **Bus factor 1 — só o Lucas tem acesso técnico.** É o risco por trás de todos os outros. Vale dar acesso
  de colaborador a pelo menos mais uma pessoa antes de sair de vez.
- **Falta um "e se o site cair" pra quem não é técnico.** Toda a documentação existente é excelente, mas é
  escrita pra quem programa. Vale um documento curto, separado, em português simples: pra quem ligar, o que
  NÃO tentar mexer sozinho, onde os dados ficam.
- **Testes E2E dos fluxos críticos ainda não existem**, apesar de já planejados em `docs/arquitetura.md`
  (seção 5) — Fluxo de Cadastro e Fluxo de Montagem ponta a ponta.
- **Arquitetura está mais simples que o documentado, e tudo bem.** `docs/arquitetura.md` descreve
  Controller → Service → Repository; na prática as Services chamam o Prisma direto. Pra um mantenedor só,
  isso é a escolha certa, não dívida técnica — só vale ajustar o doc pra refletir a decisão real.
- **O modelo "madrinha" entre paróquias ainda não virou regra escrita.** Hoje a equipe dirigente monta o
  encontro de Crato usando jovens de duas paróquias ao mesmo tempo — e isso funciona, mas por acidente: o
  isolamento por paróquia (R7) ainda não está ativo em nenhuma linha de código (o client inteiro roda numa
  única `PAROQUIA_ID_PROVISORIA` fixa, confirmado em `client/lib/constants.ts`), então nada distingue as
  fichas de uma paróquia das da outra. Quando Crato ganhar equipe dirigente própria, alguém vai perguntar
  "como um jovem de uma paróquia é convidado pra montagem de outra" — e hoje `regras-imutaveis.md` não
  responde isso: R7 descreve isolamento total entre paróquias, com o Conselho (R8, futuro) como única
  exceção, e só pra leitura, não pra participar da montagem. Vale decidir essa regra e escrevê-la agora,
  enquanto o cenário madrinha está acontecendo de verdade — não depois que fichas de duas paróquias já
  estiverem misturadas no banco sem trilha de quem pertence a quem.

---

## Na prática: o que só o Lucas resolve agora vs. o que fica pra depois

**Só o Lucas (ou a equipe dirigente atual) decide, e o timing importa** — fazer isso agora, com o contexto
todo na cabeça, é muito mais barato que reconstruir depois: onde o sistema vai ser hospedado e quem paga por
isso; confirmar que o termo de consentimento já usado no papel cobre o uso digital dos dados; quem mais vai
ter acesso técnico ao repositório; e como vai funcionar o convite de jovens entre paróquias quando Crato
ganhar equipe dirigente própria — o modelo "madrinha" de hoje ainda não é uma regra escrita.

**Trabalho técnico puro, dá pra fazer aos poucos ou delegar depois** — Auth real, exportação simples,
hardening, dependências, testes que faltam, formatação automática, health check. Nenhum desses precisa do
Lucas especificamente; precisam de alguém com acesso ao código — ele agora, ou um sucessor técnico depois,
desde que o item de sucessão já tenha sido resolvido.
