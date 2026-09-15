import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UsuarioAutenticado } from '../types/usuario-autenticado';

function contexto(user: UsuarioAutenticado | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('deixa passar quando a rota não declara @Roles', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contexto({ id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' }))).toBe(true);
  });

  it('deixa passar quando a role bate', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['CONSELHO']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contexto({ id: 'u1', role: 'CONSELHO', paroquiaId: null }))).toBe(true);
  });

  it('bloqueia quando a role não bate', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['CONSELHO']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contexto({ id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' }))).toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia requisição sem usuário autenticado', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['CONSELHO']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contexto(undefined))).toThrow(ForbiddenException);
  });
});
