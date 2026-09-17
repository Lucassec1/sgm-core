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

### 1. Backup/hospedagem do banco — EM ANDAMENTO (17/09/2026)

Banco migrado pro **Neon** (Postgres 16 gerenciado, backup automático incluído, free tier) — schema aplicado,
zero dado fake, credencial real da paróquia (Basílica Santuário Nossa Senhora das Dores) e conta de Conselho
já criadas lá. Upload de foto/Quadrante migrado pra **AWS S3** (bucket privado) pelo mesmo motivo: a
hospedagem escolhida pra rodar a aplicação (ver abaixo) tem disco efêmero.

**Falta:** hospedar a aplicação em si (hoje só o banco está fora do notebook). Decisão já tomada — **Render**
pro server, **Vercel** pro client — falta executar o deploy de fato. Dois ajustes de código já feitos
antecipando isso: cookie de sessão vira `SameSite=None` em produção (Render e Vercel são domínios
diferentes) e storage de arquivo é S3 (não filesystem).

### 2. Consentimento já existe no papel; cobre o uso digital — CONFIRMADO (16/09/2026)

Correção do Lucas: o Segue-me já entrega um termo ao jovem na inscrição em papel — ele toma ciência antes
do cadastro, e pai/responsável assina no lugar dele quando é menor de idade. **O Lucas confirmou que esse
termo já cobre o uso digital dos dados** — não precisa de revisão de texto pela coordenação. A Ficha continua
coletando dado sensível (religião, sacramentos — LGPD art. 5º, II) de gente menor de idade (LGPD art. 14),
mas o consentimento institucional já está resolvido.

O campo `termoAssinado` (sim/não) + data já existe na Ficha (implementado — ver commit `dd1e7bc`), pra que o
registro digital reflita que o termo em papel foi coletado.

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

**RESOLVIDO (16/09/2026):**

- **Hardening**: Helmet, rate limiting (`@nestjs/throttler`) e logger estruturado (`nestjs-pino`)
  implementados.
- **Health check**: `GET /health` checa conectividade real com o Postgres.
- **Rastreamento de erro**: SDK do Sentry pronto nos dois lados (server e client), inativo até
  `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` existir.
- **Cobertura de teste**: `FichasService` (66%→100%), `FichasCasaisService` (67%→98%),
  `QuadrantesService` (0%→100%) — antes concentrada só em Montagem.
- **Formatação automática**: Prettier + `.editorconfig` + Husky/lint-staged, repositório inteiro
  reformatado uma vez (commit isolado, sem mudança de lógica).

**Ainda em aberto:**

- **`npm audit`**: 28 vulnerabilidades no server (todas em dependências do `@nestjs/cli`, ferramenta
  de build — não roda em produção) e 2 no client (PostCSS, usado só em build time pelo Next). Nenhuma
  explorável através da API/site rodando pra usuário final. Corrigir de verdade exige upgrade maior
  (`@nestjs/cli` 10→12, Next.js 15→16) — adiado por ser baixo risco real, mas é dívida que só cresce.

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
- **O modelo "madrinha" entre paróquias ainda não virou regra escrita.** Agora que R7 (isolamento real) e
  R8 (Conselho) estão implementados de verdade (14-15/09/2026), essa pergunta passou de "por acidente" pra
  "vai bloquear de propósito": hoje a equipe dirigente monta o encontro de Crato usando jovens de duas
  paróquias — com o isolamento ativo, uma ficha de uma paróquia não aparece mais nas sugestões de montagem
  de outra, a menos que alguém decida como isso deveria funcionar. `regras-imutaveis.md` ainda não responde
  "como um jovem de uma paróquia é convidado pra montagem de outra": R7 descreve isolamento total, com o
  Conselho como única exceção, e só pra leitura, não pra participar da montagem. Vale decidir essa regra e
  escrevê-la agora — antes era "documentar um comportamento futuro", agora é "o sistema já aplica isolamento
  de verdade e essa lacuna vai aparecer na prática assim que alguém tentar montar com jovens de outra
  paróquia".

---

## Na prática: o que só o Lucas resolve agora vs. o que fica pra depois

**Já decidido pelo Lucas:** hospedagem (Neon pro banco, S3 pro arquivo, Render+Vercel pra aplicação — banco
migrado, app ainda não deployada) e consentimento (termo em papel confirmado que cobre uso digital).

**Ainda só o Lucas decide, e o timing importa** — fazer isso agora, com o contexto todo na cabeça, é muito
mais barato que reconstruir depois: quem mais vai ter acesso técnico ao repositório; e como vai funcionar o
convite de jovens entre paróquias agora que R7/R8 estão ativos — o modelo "madrinha" de hoje ainda não é
uma regra escrita.

**Trabalho técnico puro, dá pra fazer aos poucos ou delegar depois** — deploy de fato (Render/Vercel),
upgrade de dependências (`@nestjs/cli`, Next.js), testes E2E, documento de sucessão em português simples.
Nenhum desses precisa do Lucas especificamente; precisam de alguém com acesso ao código — ele agora, ou um
sucessor técnico depois, desde que o item de sucessão já tenha sido resolvido.
