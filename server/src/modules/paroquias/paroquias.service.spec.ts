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
    $transaction: jest.fn((cb: any) =>
      cb({
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
  });
});
