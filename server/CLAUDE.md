# server — convenções do backend

> Preencher conforme as convenções forem se firmando (padrão de endpoint, como criar módulo,
> convenção de DTO/validação, como testar Service, etc.). Ver `../CLAUDE.md` e
> `../docs/arquitetura.md` para as decisões já tomadas.

## Auth (JWT em cookie httpOnly)

Guard global (`APP_GUARD` em `app.module.ts`, classe `JwtAuthGuard`) exige sessão em toda rota
por padrão. Pra criar uma rota nova:

- **Pública** (sem login — hoje só `/auth/login`, `/auth/logout` e `/telao/montagens/:id`):
  marque com `@Public()` (`common/decorators/public.decorator.ts`).
- **De paróquia** (a maioria — Fichas, FichasCasais, Montagem): aplique
  `@UseGuards(ParoquiaScopeGuard)` no controller e use `@ParoquiaAtual()` nos parâmetros dos
  métodos em vez de receber `paroquiaId` do body/query/param — nunca confie em `paroquiaId`
  vindo do client, ele sempre vem do JWT (R7). Se o recurso pendura de uma Montagem específica
  via `@Param` (Alocações, Lista de Substituição, Quadrantes), adicione também
  `MontagemScopeGuard` (`common/guards/montagem-scope.guard.ts`) — ele confirma que a Montagem
  referenciada pertence à paróquia de quem está pedindo, e bloqueia Conselho desses recursos.
- **De uma role específica** (hoje só Conselho — `/conselho/*`, `/paroquias`):
  `@UseGuards(RolesGuard) @Roles(RoleUsuario.CONSELHO)`.
- Em qualquer service que receba `id`/`montagemId` sem o `paroquiaId` já filtrado numa query
  (`findOne`, `update`, etc.), valide que o registro pertence à paróquia antes de devolver —
  lance `NotFoundException` (não `ForbiddenException`: não revele que o registro existe em
  outra paróquia). Ver `MontagensService` como referência desse padrão.

`request.user` (populado pela `JwtStrategy` a partir do cookie `sgm_token`) tem o formato de
`UsuarioAutenticado` (`common/types/usuario-autenticado.ts`): `{ id, role, paroquiaId }`.

Login de paróquia é uma credencial **compartilhada** (não individual por pessoa) — por isso o
campo `usuario` do `LogAtividade`/R9 continua sendo texto livre digitado na tela, não vem do
token. Conselho, ao contrário, é uma conta por pessoa (`nome` obrigatório na prática) — toda
observação do Conselho numa Montagem usa o nome de quem está autenticado, nunca um campo
digitável.
