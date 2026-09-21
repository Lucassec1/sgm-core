# SGM Core — Deploy e operação

Runbook técnico: como a produção está montada, o que precisa estar configurado em cada painel e
como conferir que está tudo funcionando. Para quem **não** é técnico, ver [`sucessao.md`](./sucessao.md).

> **Sobre a confiabilidade deste documento.** O repositório não tem `render.yaml` nem `vercel.json`:
> a configuração de deploy vive só nos painéis do Render e da Vercel. Tudo marcado com **[confirmar]**
> é o que o código _exige_ ou o comando _esperado_ pelos scripts do `package.json`, mas que ninguém
> verificou no painel. Ao confirmar, troque a marca pelo valor real.

## 1. Visão geral

```
Navegador ──► Vercel (client, Next.js 16) ──► Render (server, NestJS 11) ──► Neon (Postgres 16)
                                                       │
                                                       └──► AWS S3 (fotos 3x4 e PDFs de Quadrante)
```

| Peça     | Serviço | O que roda                                         |
| -------- | ------- | -------------------------------------------------- |
| Client   | Vercel  | `/client` — build `next build`                     |
| Server   | Render  | `/server` — `nest build` + `node dist/main`        |
| Banco    | Neon    | Postgres gerenciado, backup automático do provedor |
| Arquivos | AWS S3  | Bucket privado — fotos e Quadrantes                |
| Erros    | Sentry  | Opcional — inativo até existir DSN                 |

## 2. Configuração esperada em cada painel

### Render (server)

| Campo          | Valor esperado                                                                      |
| -------------- | ----------------------------------------------------------------------------------- |
| Diretório raiz | `server` **[confirmar]**                                                            |
| Node           | 20 ou superior (o CI usa 20)                                                        |
| Build          | `npm ci && npx prisma generate && npm run build` **[confirmar]**                    |
| Migrations     | `npx prisma migrate deploy` — no build ou como _pre-deploy command_ **[confirmar]** |
| Start          | `npm run start:prod` (`node dist/main`) **[confirmar]**                             |
| Health check   | `GET /health` (responde 200 só se o Postgres estiver conectado)                     |

Sem `npx prisma generate` o build falha com dezenas de erros de tipo (`RoleUsuario`, `PrismaService`).

### Vercel (client)

| Campo          | Valor esperado                                      |
| -------------- | --------------------------------------------------- |
| Diretório raiz | `client` **[confirmar]**                            |
| Framework      | Next.js (detectado automaticamente)                 |
| Build          | `npm run build` (padrão)                            |
| Node           | 22 ou superior (`engines` do `client/package.json`) |

## 3. Variáveis de ambiente

Lista completa, com descrição, em [`readme.md`](../readme.md#variáveis-de-ambiente). O que **muda de
comportamento em produção** e por isso merece atenção:

**No Render:**

- **`NODE_ENV=production` — obrigatória.** É ela que faz o cookie de sessão sair `SameSite=None; Secure`
  (`server/src/common/auth/cookie.ts`). Como Render e Vercel são domínios diferentes, sem isso o
  navegador descarta o cookie e o login "funciona" no servidor mas o usuário volta pra tela de login.
  Também desliga o `pino-pretty` (só de desenvolvimento).
- **`CORS_ORIGINS`** com a URL exata do client na Vercel (com `https://`, sem barra final). Vazio
  reflete qualquer origem — aceitável só em dev. Se o client tiver mais de uma URL (domínio próprio +
  `*.vercel.app`), liste todas separadas por vírgula.
- **`JWT_SECRET`** — valor forte e único, diferente do de desenvolvimento. Trocar invalida todas as
  sessões abertas (todo mundo precisa logar de novo), o que é seguro, só incômodo.
- **`DATABASE_URL`** do Neon (a connection string do painel deles).
- **`AWS_REGION`, `S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`** — usuário IAM com
  acesso _só_ àquele bucket.
- **`SENTRY_DSN`** — opcional. Sem ela, nenhum erro é reportado.

**Na Vercel:**

- **`NEXT_PUBLIC_API_URL`** — URL do server no Render. Variáveis `NEXT_PUBLIC_*` são **embutidas no build**:
  mudar o valor no painel **não tem efeito até fazer um novo deploy**.
- **`NEXT_PUBLIC_SENTRY_DSN`** — opcional, mesma regra de build.

## 4. Deploy de uma mudança

1. Abrir PR pra `main`; o CI (lint, typecheck, testes, build) precisa passar.
2. Fazer merge. Se o deploy é automático por push na `main` no Render e na Vercel **[confirmar]**, ele
   dispara sozinho; senão, disparar manualmente nos dois painéis.
3. **Mudou o schema (`server/prisma/schema.prisma`)?** A migration precisa rodar no Neon _antes_ (ou junto
   com) o novo server. Ordem segura: aplicar a migration, depois subir o server. Migrations
   destrutivas (remover coluna) exigem duas etapas — primeiro parar de usar a coluna, depois removê-la.
4. Rodar o checklist da seção 5.

**Nunca rode `npm run prisma:seed` contra o banco de produção** — ele cria fichas e casais falsos.

## 5. Checklist pós-deploy

Rápido, de fora, sem criar dados:

- [ ] `GET <url-do-render>/health` → **200**. Se der 503, o server subiu mas não alcança o Postgres
      (`DATABASE_URL` errada ou Neon indisponível).
- [ ] Uma rota protegida sem sessão (ex.: `GET <url-do-render>/fichas`) → **401** (o guard global está ativo).
- [ ] Abrir o client na Vercel, fazer login com uma credencial real → chega no dashboard e **continua
      logado ao recarregar a página** (prova que o cookie `SameSite=None` foi aceito entre domínios).
- [ ] No DevTools do navegador → Application → Cookies: o cookie de sessão está marcado **HttpOnly**,
      **Secure** e **SameSite=None**.
- [ ] Nenhum erro de CORS no console do navegador (se aparecer, o `CORS_ORIGINS` está errado).
- [ ] Abrir uma ficha e o quadro de uma montagem, e conferir que carregam dados.
- [ ] Enviar uma foto de teste numa ficha de teste e conferir que aparece (exercita o S3 — a única parte
      que os testes automáticos não cobrem de verdade). Depois remover a foto.
- [ ] O Swagger fica em `<url-do-render>/docs`. **Atenção:** ele é público (sem login) também em produção — expõe
      o mapa de rotas da API, mas nenhum dado de pessoas. O comentário em `server/src/main.ts` ainda diz "sem
      Auth real" e está desatualizado. Decisão pendente: proteger, ou só ligar fora de produção.

## 6. Primeira conta de Conselho em produção

Não existe cadastro público. A primeira conta nasce por script, de dentro de `/server`, com a
`DATABASE_URL` de produção (idempotente por `login`, não mexe em fichas nem montagens):

```bash
SEED_CONSELHO_LOGIN=... SEED_CONSELHO_SENHA='...' SEED_CONSELHO_NOME='...' \
  npm run prisma:seed:bootstrap-conselho
```

Depois, essa conta cria as demais (Conselho e credenciais de paróquia) pela interface.

## 7. Limites do plano gratuito — o que confirmar nos painéis

Esses itens dependem do plano contratado e mudam com o tempo; **confira nos painéis** em vez de confiar
em números escritos aqui:

- **Render free hiberna** depois de um período sem requisições, e a primeira requisição depois disso
  demora (dezenas de segundos). Para a equipe dirigente isso parece "o site caiu". Opções: plano pago,
  ou um monitor externo que faça ping em `/health` periodicamente.
- **Neon free:** confira o período de retenção do backup/restore no plano atual e o limite de
  armazenamento. Considere agendar, além do backup do provedor, uma exportação periódica (o botão de
  CSV do dashboard cobre o essencial para quem não é técnico).
- **S3:** ative _versioning_ no bucket se quiser poder recuperar uma foto apagada por engano. O bucket
  deve permanecer **privado**.
- **Sentry:** sem DSN nos dois lados, ninguém fica sabendo de erros em produção.

## 8. Quando algo quebra

| Sintoma                                           | Onde olhar primeiro                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Site "lento / não abre" na primeira visita do dia | Render free hibernando (seção 7). Esperar ~1 min e recarregar.                  |
| Loga, mas volta pra tela de login                 | `NODE_ENV=production` ausente no Render, ou `CORS_ORIGINS` sem a URL do client. |
| Erro de CORS no console                           | `CORS_ORIGINS` (seção 3). Conferir `https://`, e barra final.                   |
| `/health` retorna 503                             | `DATABASE_URL`, ou Neon fora do ar / pausado.                                   |
| Foto/Quadrante não sobe ou não aparece            | Credenciais e região do S3, permissões do usuário IAM, nome do bucket.          |
| Client chama a API errada depois de trocar de URL | `NEXT_PUBLIC_API_URL` é do build — fazer novo deploy na Vercel.                 |
| Todo mundo foi deslogado                          | `JWT_SECRET` mudou (esperado) ou a sessão de 12h expirou.                       |
| Build do server falha com erros de tipo do Prisma | Faltou `npx prisma generate` no comando de build.                               |

Logs do server: painel do Render (logs estruturados em JSON, via `nestjs-pino`). Erros: Sentry, se o DSN
estiver configurado.
