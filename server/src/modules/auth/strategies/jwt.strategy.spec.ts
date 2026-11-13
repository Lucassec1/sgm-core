import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';

function criarStrategy() {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('segredo-fake'),
  } as unknown as ConfigService;
  const prisma = { usuario: { findUnique: jest.fn() }, implantacao: { findFirst: jest.fn() } };
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

  it('recusa token emitido antes da última troca de senha, mesmo no mesmo segundo', async () => {
    const { strategy, prisma } = criarStrategy();
    const trocaEm = new Date('2026-10-20T12:00:00.500Z');
    prisma.usuario.findUnique.mockResolvedValue({ ...USUARIO_ATIVO, senhaAlteradaEm: trocaEm });
    const payload = { sub: 'u1', role: 'PAROQUIA' as const, paroquiaId: 'p1' };

    // 400 ms antes da troca, mesmo segundo — antes passava (comparação em segundos)
    await expect(
      strategy.validate({ ...payload, emitidoEm: trocaEm.getTime() - 400 }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate({ ...payload, emitidoEm: trocaEm.getTime() })).resolves.toEqual({
      id: 'u1',
      role: 'PAROQUIA',
      paroquiaId: 'p1',
    });
  });

  it('token antigo sem emitidoEm: usa o iat contando do início do segundo', async () => {
    const { strategy, prisma } = criarStrategy();
    const trocaEm = new Date('2026-10-20T12:00:00.500Z');
    const segundoDaTroca = Math.floor(trocaEm.getTime() / 1000);
    prisma.usuario.findUnique.mockResolvedValue({ ...USUARIO_ATIVO, senhaAlteradaEm: trocaEm });
    const payload = { sub: 'u1', role: 'PAROQUIA' as const, paroquiaId: 'p1' };

    await expect(strategy.validate({ ...payload, iat: segundoDaTroca })).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(strategy.validate({ ...payload, iat: segundoDaTroca + 1 })).resolves.toEqual({
      id: 'u1',
      role: 'PAROQUIA',
      paroquiaId: 'p1',
    });
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

  describe('atuando como afilhada (implantação)', () => {
    it('vínculo em IMPLANTACAO com a paróquia como madrinha troca o paroquiaId da sessão', async () => {
      const { strategy, prisma } = criarStrategy();
      prisma.usuario.findUnique.mockResolvedValue(USUARIO_ATIVO);
      prisma.implantacao.findFirst.mockResolvedValue({ afilhadaId: 'afilhada' });

      const resultado = await strategy.validate({
        sub: 'u1',
        role: 'PAROQUIA',
        paroquiaId: 'p1',
        implantacaoId: 'i1',
      });

      expect(prisma.implantacao.findFirst).toHaveBeenCalledWith({
        where: { id: 'i1', madrinhaId: 'p1', fase: 'IMPLANTACAO' },
        select: { afilhadaId: true },
      });
      expect(resultado).toEqual({
        id: 'u1',
        role: 'PAROQUIA',
        paroquiaId: 'afilhada',
        paroquiaOrigemId: 'p1',
        implantacaoId: 'i1',
      });
    });

    it('vínculo que saiu da IMPLANTACAO: volta pra madrinha e marca a atuação como encerrada', async () => {
      const { strategy, prisma } = criarStrategy();
      prisma.usuario.findUnique.mockResolvedValue(USUARIO_ATIVO);
      prisma.implantacao.findFirst.mockResolvedValue(null);

      const resultado = await strategy.validate({
        sub: 'u1',
        role: 'PAROQUIA',
        paroquiaId: 'p1',
        implantacaoId: 'i1',
      });

      expect(resultado).toEqual({
        id: 'u1',
        role: 'PAROQUIA',
        paroquiaId: 'p1',
        atuacaoEncerrada: true,
      });
    });

    it('conta do Conselho com implantacaoId no token é ignorada', async () => {
      const { strategy, prisma } = criarStrategy();
      prisma.usuario.findUnique.mockResolvedValue({
        ...USUARIO_ATIVO,
        role: 'CONSELHO',
        paroquiaId: null,
      });

      const resultado = await strategy.validate({
        sub: 'u1',
        role: 'CONSELHO',
        paroquiaId: null,
        implantacaoId: 'i1',
      });

      expect(prisma.implantacao.findFirst).not.toHaveBeenCalled();
      expect(resultado).toEqual({ id: 'u1', role: 'CONSELHO', paroquiaId: null });
    });
  });
});
