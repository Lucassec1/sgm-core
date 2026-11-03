import { ConflictException, NotFoundException } from '@nestjs/common';
import { ParoquiasService } from './paroquias.service';
import { PrismaService } from '../../prisma/prisma.service';

function criarPrismaMock() {
  return {
    usuario: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paroquia: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    tokenRedefinicaoSenha: { deleteMany: jest.fn() },
    // callback (create) roda num client transacional fake; array (reset) só aguarda tudo
    $transaction: jest.fn((arg: any) =>
      Array.isArray(arg)
        ? Promise.all(arg)
        : arg({
            paroquia: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
            usuario: { create: jest.fn() },
          }),
    ),
  };
}

describe('ParoquiasService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let service: ParoquiasService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new ParoquiasService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('lista paróquias ordenadas por nome, com os usuários PAROQUIA de cada uma', async () => {
      prisma.paroquia.findMany.mockResolvedValue([{ id: 'p1', nome: 'Paróquia X' }]);

      const resultado = await service.findAll();

      expect(prisma.paroquia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { nome: 'asc' },
          include: {
            usuarios: {
              where: { role: 'PAROQUIA' },
              select: { id: true, login: true, ativo: true },
            },
          },
        }),
      );
      expect(resultado).toEqual([{ id: 'p1', nome: 'Paróquia X' }]);
    });
  });

  describe('create', () => {
    it('rejeita login já em uso', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(
        service.create({ nome: 'Paróquia X', login: 'existente', senha: 'senha-forte' }),
      ).rejects.toThrow(ConflictException);
    });

    it('cria paróquia + usuário numa transação', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      const paroquia = await service.create({
        nome: 'Paróquia X',
        login: 'nova',
        senha: 'senha-forte',
      });
      expect(paroquia).toEqual({ id: 'p1' });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('resetCredenciais', () => {
    it('lança NotFoundException se não existir usuário PAROQUIA pra essa paróquia', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);
      await expect(service.resetCredenciais('p1', { senha: 'nova-senha-forte' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('atualiza a senha do usuário existente', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: 'u1' });
      const resultado = await service.resetCredenciais('p1', { senha: 'nova-senha-forte' });
      expect(resultado).toEqual({ ok: true });
      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
    });

    it('sem e-mail novo, limpa o e-mail de recuperação e invalida links pendentes', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: 'u1' });
      await service.resetCredenciais('p1', { senha: 'nova-senha-forte' });
      expect(prisma.usuario.update.mock.calls[0][0].data.emailRecuperacao).toBeNull();
      expect(prisma.tokenRedefinicaoSenha.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId: 'u1' },
      });
    });

    it('grava o e-mail de recuperação novo quando informado', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: 'u1' });
      await service.resetCredenciais('p1', {
        senha: 'nova-senha-forte',
        emailRecuperacao: ' Secretaria@Paroquia.org ',
      });
      expect(prisma.usuario.update.mock.calls[0][0].data.emailRecuperacao).toBe(
        'secretaria@paroquia.org',
      );
    });
  });
});
