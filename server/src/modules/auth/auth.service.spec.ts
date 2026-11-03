import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

const USUARIO_ID = 'usuario-1';

function criarPrismaMock() {
  return {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tokenRedefinicaoSenha: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
}

function criarJwtServiceMock() {
  return { signAsync: jest.fn().mockResolvedValue('token-fake') };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let jwtService: ReturnType<typeof criarJwtServiceMock>;
  let emailService: { enviar: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    jwtService = criarJwtServiceMock();
    emailService = { enviar: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as any,
      emailService as any,
    );
  });

  describe('validarUsuario', () => {
    it('rejeita login inexistente', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.validarUsuario('ninguem', 'senha')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejeita usuário inativo', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: USUARIO_ID,
        ativo: false,
        senhaHash: 'hash',
      });
      await expect(service.validarUsuario('login', 'senha')).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita senha errada', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      prisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_ID, ativo: true, senhaHash });
      await expect(service.validarUsuario('login', 'senha-errada')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('aceita senha correta e devolve o usuário', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      const usuario = {
        id: USUARIO_ID,
        ativo: true,
        senhaHash,
        role: 'PAROQUIA',
        paroquiaId: 'p1',
      };
      prisma.usuario.findUnique.mockResolvedValue(usuario);
      await expect(service.validarUsuario('login', 'senha-certa')).resolves.toEqual(usuario);
    });
  });

  describe('login', () => {
    it('assina um JWT com sub/role/paroquiaId', async () => {
      await service.login({ id: USUARIO_ID, role: 'PAROQUIA', paroquiaId: 'p1' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: USUARIO_ID,
        role: 'PAROQUIA',
        paroquiaId: 'p1',
      });
    });
  });

  describe('alterarSenha', () => {
    it('lança UnauthorizedException se o usuário não existir', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.alterarSenha(USUARIO_ID, 'atual', 'nova-senha')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejeita se a senha atual estiver errada', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      prisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_ID, senhaHash });
      await expect(
        service.alterarSenha(USUARIO_ID, 'senha-errada', 'nova-senha-forte'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('atualiza o hash quando a senha atual está correta', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      prisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_ID, senhaHash });

      await service.alterarSenha(USUARIO_ID, 'senha-certa', 'nova-senha-forte');

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: USUARIO_ID } }),
      );
      const novoHash = (prisma.usuario.update as jest.Mock).mock.calls[0][0].data.senhaHash;
      await expect(bcrypt.compare('nova-senha-forte', novoHash)).resolves.toBe(true);
      // derruba as sessões abertas com a senha antiga (ver JwtStrategy)
      expect((prisma.usuario.update as jest.Mock).mock.calls[0][0].data.senhaAlteradaEm).toEqual(
        expect.any(Date),
      );
    });
  });

  describe('alterarEmailRecuperacao', () => {
    it('exige a senha atual', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      prisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_ID, senhaHash });
      await expect(
        service.alterarEmailRecuperacao(USUARIO_ID, 'senha-errada', 'a@b.org'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('grava o e-mail normalizado (minúsculo, sem espaços)', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      prisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_ID, senhaHash });
      await service.alterarEmailRecuperacao(USUARIO_ID, 'senha-certa', ' Secretaria@Paroquia.org ');
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: USUARIO_ID },
        data: { emailRecuperacao: 'secretaria@paroquia.org' },
      });
    });
  });

  describe('solicitarRedefinicao', () => {
    const usuarioComEmail = {
      id: USUARIO_ID,
      login: 'paroquia-se',
      ativo: true,
      emailRecuperacao: 'secretaria@paroquia.org',
    };

    it('não faz nada (e não lança) para login inexistente, inativo ou sem e-mail', async () => {
      for (const usuario of [
        null,
        { ...usuarioComEmail, ativo: false },
        { ...usuarioComEmail, emailRecuperacao: null },
      ]) {
        prisma.usuario.findUnique.mockResolvedValue(usuario);
        await expect(service.solicitarRedefinicao('x')).resolves.toBeUndefined();
      }
      expect(prisma.tokenRedefinicaoSenha.create).not.toHaveBeenCalled();
      expect(emailService.enviar).not.toHaveBeenCalled();
    });

    it('guarda só o hash do token e manda o link (token no fragmento) pro e-mail', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioComEmail);

      await service.solicitarRedefinicao('paroquia-se');

      const email = emailService.enviar.mock.calls[0][0];
      expect(email.para).toBe('secretaria@paroquia.org');
      const token = /redefinir-senha#token=([\w-]+)/.exec(email.texto)?.[1];
      expect(token).toBeDefined();
      const { tokenHash, expiraEm } = prisma.tokenRedefinicaoSenha.create.mock.calls[0][0].data;
      expect(tokenHash).toBe(createHash('sha256').update(token!).digest('hex'));
      expect(tokenHash).not.toBe(token);
      expect(expiraEm.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    });

    it('ignora pedido repetido dentro de 2 minutos', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioComEmail);
      prisma.tokenRedefinicaoSenha.findFirst.mockResolvedValue({ id: 't-recente' });

      await service.solicitarRedefinicao('paroquia-se');

      expect(prisma.tokenRedefinicaoSenha.create).not.toHaveBeenCalled();
      expect(emailService.enviar).not.toHaveBeenCalled();
    });
  });

  describe('redefinirSenha', () => {
    const tokenValido = {
      id: 't1',
      usuarioId: USUARIO_ID,
      usadoEm: null,
      expiraEm: new Date(Date.now() + 10 * 60 * 1000),
      usuario: { ativo: true },
    };

    it('rejeita token inexistente, já usado, expirado ou de conta inativa', async () => {
      for (const registro of [
        null,
        { ...tokenValido, usadoEm: new Date() },
        { ...tokenValido, expiraEm: new Date(Date.now() - 1000) },
        { ...tokenValido, usuario: { ativo: false } },
      ]) {
        prisma.tokenRedefinicaoSenha.findUnique.mockResolvedValue(registro);
        await expect(service.redefinirSenha('tok', 'nova-senha-forte')).rejects.toThrow(
          BadRequestException,
        );
      }
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('troca a senha, derruba sessões antigas e marca o token como usado', async () => {
      prisma.tokenRedefinicaoSenha.findUnique.mockResolvedValue(tokenValido);

      await service.redefinirSenha('tok', 'nova-senha-forte');

      expect(prisma.tokenRedefinicaoSenha.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: createHash('sha256').update('tok').digest('hex') },
        }),
      );
      const { data } = prisma.usuario.update.mock.calls[0][0];
      await expect(bcrypt.compare('nova-senha-forte', data.senhaHash)).resolves.toBe(true);
      expect(data.senhaAlteradaEm).toEqual(expect.any(Date));
      expect(prisma.tokenRedefinicaoSenha.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { usadoEm: expect.any(Date) },
      });
    });
  });

  describe('me', () => {
    it('lança UnauthorizedException se o usuário não existir mais', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.me(USUARIO_ID)).rejects.toThrow(UnauthorizedException);
    });

    it('devolve os dados públicos do usuário', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: USUARIO_ID,
        login: 'paroquia-dev',
        role: 'PAROQUIA',
        nome: null,
        paroquia: { id: 'p1', nome: 'Paróquia Dev' },
      });
      await expect(service.me(USUARIO_ID)).resolves.toEqual({
        id: USUARIO_ID,
        login: 'paroquia-dev',
        role: 'PAROQUIA',
        nome: null,
        paroquia: { id: 'p1', nome: 'Paróquia Dev' },
      });
    });
  });
});
