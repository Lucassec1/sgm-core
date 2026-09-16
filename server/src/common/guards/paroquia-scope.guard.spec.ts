import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ParoquiaScopeGuard } from './paroquia-scope.guard';
import { UsuarioAutenticado } from '../types/usuario-autenticado';

function contexto(user: UsuarioAutenticado | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('ParoquiaScopeGuard', () => {
  const guard = new ParoquiaScopeGuard();

  it('deixa passar conta PAROQUIA com paroquiaId', () => {
    expect(guard.canActivate(contexto({ id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' }))).toBe(
      true,
    );
  });

  it('bloqueia conta PAROQUIA sem paroquiaId', () => {
    expect(() =>
      guard.canActivate(contexto({ id: 'u1', role: 'PAROQUIA', paroquiaId: null })),
    ).toThrow(ForbiddenException);
  });

  it('deixa passar conta CONSELHO mesmo sem paroquiaId', () => {
    expect(guard.canActivate(contexto({ id: 'u1', role: 'CONSELHO', paroquiaId: null }))).toBe(
      true,
    );
  });

  it('bloqueia requisição sem usuário autenticado', () => {
    expect(() => guard.canActivate(contexto(undefined))).toThrow(ForbiddenException);
  });
});
