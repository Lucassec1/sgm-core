import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

const USUARIO_ID = 'usuario-1';
const EMAIL = 'paroquiasaojose@gmail.com';

function criarPrismaMock() {
  return {
    usuario: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    implantacao: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
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

function tokenDoEmail(emailService: { enviar: jest.Mock }) {
  const texto = emailService.enviar.mock.calls[0][0].texto as string;
  return /redefinir-senha#token=([\w-]+)/.exec(texto)?.[1];
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
    it('busca o login sem diferenciar maiúsculas e ignorando espaços', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);
      await expect(service.validarUsuario('  ParoquiaSaoJose@Gmail.com ', 'x')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
        where: { login: { equals: 'ParoquiaSaoJose@Gmail.com', mode: 'insensitive' } },
      });
    });

    it('rejeita usuário inativo', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: USUARIO_ID, ativo: false, senhaHash: 'h' });
      await expect(service.validarUsuario(EMAIL, 'senha')).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita senha errada (inclusive vazia)', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      prisma.usuario.findFirst.mockResolvedValue({ id: USUARIO_ID, ativo: true, senhaHash });
      await expect(service.validarUsuario(EMAIL, 'senha-errada')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validarUsuario(EMAIL, '')).rejects.toThrow(UnauthorizedException);
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
      prisma.usuario.findFirst.mockResolvedValue(usuario);
      await expect(service.validarUsuario(EMAIL, 'senha-certa')).resolves.toEqual(usuario);
    });

    it('primeiro acesso (sem senha): manda o link de criar senha e responde PRIMEIRO_ACESSO', async () => {
      prisma.usuario.findFirst.mockResolvedValue({
        id: USUARIO_ID,
        login: EMAIL,
        ativo: true,
        senhaHash: null,
      });

      const erro = await service.validarUsuario(EMAIL, '').catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ForbiddenException);
      expect((erro as ForbiddenException).getResponse()).toEqual(
        expect.objectContaining({ code: 'PRIMEIRO_ACESSO' }),
      );
      const email = emailService.enviar.mock.calls[0][0];
      expect(email.para).toBe(EMAIL);
      expect(email.assunto).toContain('crie sua senha');
      expect(tokenDoEmail(emailService)).toBeDefined();
    });
  });

  describe('login', () => {
    it('assina um JWT com sub/role/paroquiaId', async () => {
      await service.login({ id: USUARIO_ID, role: 'PAROQUIA', paroquiaId: 'p1' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: USUARIO_ID,
        role: 'PAROQUIA',
        paroquiaId: 'p1',
        emitidoEm: expect.any(Number),
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

    it('rejeita se a senha atual estiver errada ou a conta ainda não tiver senha', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      for (const usuario of [
        { id: USUARIO_ID, senhaHash },
        { id: USUARIO_ID, senhaHash: null },
      ]) {
        prisma.usuario.findUnique.mockResolvedValue(usuario);
        await expect(
          service.alterarSenha(USUARIO_ID, 'senha-errada', 'nova-senha-forte'),
        ).rejects.toThrow(UnauthorizedException);
      }
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('atualiza o hash, derruba sessões antigas e invalida links pendentes', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      prisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_ID, senhaHash });

      await service.alterarSenha(USUARIO_ID, 'senha-certa', 'nova-senha-forte');

      const { where, data } = prisma.usuario.update.mock.calls[0][0];
      expect(where).toEqual({ id: USUARIO_ID });
      await expect(bcrypt.compare('nova-senha-forte', data.senhaHash)).resolves.toBe(true);
      expect(data.senhaAlteradaEm).toEqual(expect.any(Date));
      expect(prisma.tokenRedefinicaoSenha.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId: USUARIO_ID },
      });
    });
  });

  describe('solicitarLink', () => {
    const contaComSenha = { id: USUARIO_ID, login: EMAIL, ativo: true, senhaHash: 'h' };

    it('não faz nada (e não lança) para e-mail não cadastrado, conta inativa ou login antigo sem e-mail', async () => {
      for (const usuario of [
        null,
        { ...contaComSenha, ativo: false },
        { ...contaComSenha, login: 'paroquia-dev' },
      ]) {
        prisma.usuario.findFirst.mockResolvedValue(usuario);
        await expect(service.solicitarLink('x')).resolves.toBeUndefined();
      }
      expect(prisma.tokenRedefinicaoSenha.create).not.toHaveBeenCalled();
      expect(emailService.enviar).not.toHaveBeenCalled();
    });

    it('guarda só o hash do token e manda o link (token no fragmento) pro e-mail da conta', async () => {
      prisma.usuario.findFirst.mockResolvedValue(contaComSenha);

      await service.solicitarLink(EMAIL);

      const email = emailService.enviar.mock.calls[0][0];
      expect(email.para).toBe(EMAIL);
      expect(email.assunto).toContain('redefinir senha');
      const token = tokenDoEmail(emailService);
      const { tokenHash, expiraEm } = prisma.tokenRedefinicaoSenha.create.mock.calls[0][0].data;
      expect(tokenHash).toBe(createHash('sha256').update(token!).digest('hex'));
      expect(expiraEm.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    });

    it('ignora pedido repetido dentro de 2 minutos', async () => {
      prisma.usuario.findFirst.mockResolvedValue(contaComSenha);
      prisma.tokenRedefinicaoSenha.findFirst.mockResolvedValue({ id: 't-recente' });

      await service.solicitarLink(EMAIL);

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

    it('cria/troca a senha, derruba sessões antigas e marca o token como usado', async () => {
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

    it('devolve os dados públicos do usuário (nunca o hash)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: USUARIO_ID,
        login: EMAIL,
        senhaHash: 'hash',
        role: 'PAROQUIA',
        nome: null,
        paroquia: { id: 'p1', nome: 'Paróquia Dev' },
      });
      await expect(service.me(USUARIO_ID)).resolves.toEqual({
        id: USUARIO_ID,
        login: EMAIL,
        role: 'PAROQUIA',
        nome: null,
        paroquia: { id: 'p1', nome: 'Paróquia Dev' },
        atuando: null,
        podeAtuarEm: [],
      });
    });

    it('madrinha: lista as afilhadas em implantação e diz por qual está atuando', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: USUARIO_ID,
        login: EMAIL,
        role: 'PAROQUIA',
        nome: null,
        paroquiaId: 'p1',
        paroquia: { id: 'p1', nome: 'Paróquia Dev' },
      });
      prisma.implantacao.findMany.mockResolvedValue([
        { id: 'i1', afilhada: { id: 'a1', nome: 'Paróquia X' } },
      ]);

      const me = await service.me(USUARIO_ID, 'i1');

      expect(prisma.implantacao.findMany).toHaveBeenCalledWith({
        where: { madrinhaId: 'p1', fase: 'IMPLANTACAO' },
        select: { id: true, afilhada: { select: { id: true, nome: true } } },
      });
      expect(me.podeAtuarEm).toEqual([
        { implantacaoId: 'i1', afilhada: { id: 'a1', nome: 'Paróquia X' } },
      ]);
      expect(me.atuando).toEqual({
        implantacaoId: 'i1',
        afilhada: { id: 'a1', nome: 'Paróquia X' },
      });
    });
  });

  describe('validarAtuacao', () => {
    const madrinha = { id: USUARIO_ID, role: 'PAROQUIA' as const, paroquiaId: 'p1' };

    it('vínculo de outra madrinha ou fora da implantação → 403', async () => {
      prisma.implantacao.findFirst.mockResolvedValue(null);
      await expect(service.validarAtuacao(madrinha, 'i1')).rejects.toThrow(ForbiddenException);
      expect(prisma.implantacao.findFirst).toHaveBeenCalledWith({
        where: { id: 'i1', madrinhaId: 'p1', fase: 'IMPLANTACAO' },
      });
    });

    it('já atuando, confere pela paróquia de origem (a madrinha)', async () => {
      prisma.implantacao.findFirst.mockResolvedValue({ id: 'i2' });
      await service.validarAtuacao(
        { ...madrinha, paroquiaId: 'a1', paroquiaOrigemId: 'p1', implantacaoId: 'i1' },
        'i2',
      );
      expect(prisma.implantacao.findFirst).toHaveBeenCalledWith({
        where: { id: 'i2', madrinhaId: 'p1', fase: 'IMPLANTACAO' },
      });
    });

    it('conta do Conselho → 403', async () => {
      await expect(
        service.validarAtuacao({ id: 'c1', role: 'CONSELHO', paroquiaId: null }, 'i1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
