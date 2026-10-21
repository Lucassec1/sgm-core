import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';

function criarStrategy() {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('segredo-fake'),
  } as unknown as ConfigService;
  const prisma = { usuario: { findUnique: jest.fn() } };
  const strategy = new JwtStrategy(config, prisma as unknown as PrismaService);
  return { strategy, prisma };
}

const USUARIO_ATIVO = {
  id: 'u1',
  role: 'PAROQUIA',
  paroquiaId: 'p1',
  ativo: true,
  senhaAlteradaEm: null,
};

describe('JwtStrategy', () => {
  it('valida o payload e devolve o formato de request.user', async () => {
    const { strategy, prisma } = criarStrategy();
    prisma.usuario.findUnique.mockResolvedValue(USUARIO_ATIVO);

    const resultado = await strategy.validate({ sub: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' });

    expect(resultado).toEqual({ id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' });
  });

  it('recusa sessão de usuário que não existe mais', async () => {
    const { strategy, prisma } = criarStrategy();
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('recusa sessão de usuário desativado', async () => {
    const { strategy, prisma } = criarStrategy();
    prisma.usuario.findUnique.mockResolvedValue({ ...USUARIO_ATIVO, ativo: false });

    await expect(
      strategy.validate({ sub: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('recusa token emitido antes da última troca de senha e aceita os posteriores', async () => {
    const { strategy, prisma } = criarStrategy();
    const trocaEm = new Date('2026-10-20T12:00:00Z');
    const trocaSeg = trocaEm.getTime() / 1000;
    prisma.usuario.findUnique.mockResolvedValue({ ...USUARIO_ATIVO, senhaAlteradaEm: trocaEm });

    await expect(
      strategy.validate({ sub: 'u1', role: 'PAROQUIA', paroquiaId: 'p1', iat: trocaSeg - 1 }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      strategy.validate({ sub: 'u1', role: 'PAROQUIA', paroquiaId: 'p1', iat: trocaSeg }),
    ).resolves.toEqual({ id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' });
  });

  describe('extractFromCookie (via passport-jwt jwtFromRequest)', () => {
    it('lê o token do cookie sgm_token', () => {
      const { strategy } = criarStrategy();
      const extractor = (strategy as unknown as { _jwtFromRequest: (req: unknown) => unknown })
        ._jwtFromRequest;

      expect(extractor({ cookies: { sgm_token: 'token-fake' } })).toBe('token-fake');
    });

    it('devolve null quando não há cookie sgm_token', () => {
      const { strategy } = criarStrategy();
      const extractor = (strategy as unknown as { _jwtFromRequest: (req: unknown) => unknown })
        ._jwtFromRequest;

      expect(extractor({ cookies: {} })).toBeNull();
      expect(extractor({})).toBeNull();
    });
  });
});
