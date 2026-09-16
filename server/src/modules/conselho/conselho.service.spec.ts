import { NotFoundException } from '@nestjs/common';
import { ConselhoService } from './conselho.service';
import { PrismaService } from '../../prisma/prisma.service';

const MONTAGEM_ID = 'montagem-1';

function criarPrismaMock() {
  return {
    montagem: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
    },
    observacaoMontagem: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
  };
}

describe('ConselhoService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let service: ConselhoService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new ConselhoService(prisma as unknown as PrismaService);
  });

  describe('obterMontagem', () => {
    it('lança NotFoundException se a montagem não existir', async () => {
      prisma.montagem.findUnique.mockResolvedValue(null);
      await expect(service.obterMontagem(MONTAGEM_ID)).rejects.toThrow(NotFoundException);
    });

    it('devolve a montagem de qualquer paróquia, sem checagem de posse', async () => {
      const montagem = { id: MONTAGEM_ID, paroquiaId: 'p-qualquer' };
      prisma.montagem.findUnique.mockResolvedValue(montagem);
      await expect(service.obterMontagem(MONTAGEM_ID)).resolves.toEqual(montagem);
    });
  });

  describe('listarMontagens', () => {
    it('lista sem filtro de paroquiaId quando não informado', async () => {
      await service.listarMontagens({});
      expect(prisma.montagem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('filtra por paroquiaId quando informado', async () => {
      await service.listarMontagens({ paroquiaId: 'p1' });
      expect(prisma.montagem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paroquiaId: 'p1' } }),
      );
    });
  });

  describe('criarObservacao', () => {
    it('grava usuarioId e texto vinculados à montagem', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID });
      await service.criarObservacao(MONTAGEM_ID, 'usuario-1', 'Observação de teste');
      expect(prisma.observacaoMontagem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { montagemId: MONTAGEM_ID, usuarioId: 'usuario-1', texto: 'Observação de teste' },
        }),
      );
    });

    it('lança NotFoundException se a montagem não existir', async () => {
      prisma.montagem.findUnique.mockResolvedValue(null);
      await expect(service.criarObservacao(MONTAGEM_ID, 'usuario-1', 'texto')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
