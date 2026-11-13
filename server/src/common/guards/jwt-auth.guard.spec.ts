import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsuarioAutenticado } from '../types/usuario-autenticado';

// AuthGuard('jwt') vem do @nestjs/passport — mocka o `canActivate` herdado (super) pra testar
// só a lógica adicionada aqui (bypass de @Public() e renovação do cookie), não o passport em si.
function criarContexto(user: UsuarioAutenticado | undefined, url = '/montagens') {
  const cookie = jest.fn();
  const request = { user, url };
  const response = { cookie };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, response };
}

describe('JwtAuthGuard', () => {
  it('deixa passar rotas @Public() sem checar nada', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const jwtService = { signAsync: jest.fn() } as unknown as JwtService;
    const guard = new JwtAuthGuard(reflector, jwtService);

    const { context, response } = criarContexto(undefined);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('bloqueia quando a autenticação do passport falha', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const jwtService = { signAsync: jest.fn() } as unknown as JwtService;
    const guard = new JwtAuthGuard(reflector, jwtService);
    jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockResolvedValue(false);

    const { context, response } = criarContexto(undefined);
    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('renova o cookie com nova expiração quando autenticado', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('token-renovado'),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(reflector, jwtService);
    jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockResolvedValue(true);

    const user: UsuarioAutenticado = { id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' };
    const { context, response } = criarContexto(user);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      role: 'PAROQUIA',
      paroquiaId: 'p1',
      emitidoEm: expect.any(Number),
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'sgm_token',
      'token-renovado',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('atuando como afilhada, o token renovado mantém a atuação e a paróquia de origem', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('token-renovado'),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(reflector, jwtService);
    jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockResolvedValue(true);

    const user: UsuarioAutenticado = {
      id: 'u1',
      role: 'PAROQUIA',
      paroquiaId: 'afilhada',
      paroquiaOrigemId: 'madrinha',
      implantacaoId: 'i1',
    };
    const { context } = criarContexto(user);

    await guard.canActivate(context);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      role: 'PAROQUIA',
      paroquiaId: 'madrinha',
      implantacaoId: 'i1',
      emitidoEm: expect.any(Number),
    });
  });

  describe('atuação encerrada (fase mudou com a madrinha atuando)', () => {
    function guardAutenticado() {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as Reflector;
      const jwtService = {
        signAsync: jest.fn().mockResolvedValue('token-madrinha'),
      } as unknown as JwtService;
      const guard = new JwtAuthGuard(reflector, jwtService);
      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);
      return { guard, jwtService };
    }
    const user: UsuarioAutenticado = {
      id: 'u1',
      role: 'PAROQUIA',
      paroquiaId: 'madrinha',
      atuacaoEncerrada: true,
    };

    it('não executa a ação: renova o cookie já sem a atuação e responde 409 ATUACAO_ENCERRADA', async () => {
      const { guard, jwtService } = guardAutenticado();
      const { context, response } = criarContexto(user, '/fichas');

      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'ATUACAO_ENCERRADA' }),
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.not.objectContaining({ implantacaoId: expect.anything() }),
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'sgm_token',
        'token-madrinha',
        expect.anything(),
      );
    });

    it('rotas de auth seguem (o me precisa responder pra o client se reorganizar)', async () => {
      const { guard } = guardAutenticado();
      const { context } = criarContexto(user, '/auth/me');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });
});
