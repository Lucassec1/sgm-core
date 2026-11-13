import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authService = {
    alterarSenha: jest.fn(),
    login: jest.fn().mockResolvedValue('token'),
    me: jest.fn().mockResolvedValue({ id: 'u1' }),
    validarAtuacao: jest.fn(),
  };
  const controller = new AuthController(authService as unknown as AuthService);
  const res = { cookie: jest.fn() } as any;
  const madrinha = { id: 'u1', role: 'PAROQUIA' as const, paroquiaId: 'p1' };
  const atuando = { ...madrinha, paroquiaId: 'a1', paroquiaOrigemId: 'p1', implantacaoId: 'i1' };

  beforeEach(() => jest.clearAllMocks());

  it('trocar senha atuando como afilhada → 403', async () => {
    await expect(
      controller.alterarSenha(
        { senhaAtual: 'a', senhaNova: 'b' } as any,
        { user: atuando } as any,
        res,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(authService.alterarSenha).not.toHaveBeenCalled();
  });

  it('atuar: valida, grava o cookie com a atuação e devolve o me da atuação', async () => {
    await controller.atuar({ implantacaoId: 'i1' }, { user: madrinha } as any, res);
    expect(authService.validarAtuacao).toHaveBeenCalledWith(madrinha, 'i1');
    expect(authService.login).toHaveBeenCalledWith(
      { id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' },
      'i1',
    );
    expect(res.cookie).toHaveBeenCalledWith('sgm_token', 'token', expect.any(Object));
    expect(authService.me).toHaveBeenCalledWith('u1', 'i1');
  });

  it('parar de atuar: cookie da própria paróquia (a madrinha)', async () => {
    await controller.pararDeAtuar({ user: atuando } as any, res);
    expect(authService.login).toHaveBeenCalledWith({
      id: 'u1',
      role: 'PAROQUIA',
      paroquiaId: 'p1',
    });
    expect(authService.me).toHaveBeenCalledWith('u1');
  });
});
