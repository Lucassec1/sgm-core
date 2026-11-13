import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ImplantacoesService } from './implantacoes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ParoquiasService } from '../paroquias/paroquias.service';

function criarPrismaMock() {
  const tx = {
    paroquia: { create: jest.fn().mockResolvedValue({ id: 'afilhada', nome: 'Paróquia X' }) },
    implantacao: {
      create: jest.fn((args: any) => ({ id: 'i1', ...args.data })),
      update: jest.fn((args: any) => ({ id: args.where.id, ...args.data })),
    },
    ficha: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
  };
  return {
    tx,
    paroquia: { findUnique: jest.fn() },
    implantacao: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
}

const vinculo = (fase: string) => ({
  id: 'i1',
  madrinhaId: 'madrinha',
  afilhadaId: 'afilhada',
  fase,
});

describe('ImplantacoesService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let paroquias: { criarConta: jest.Mock };
  let service: ImplantacoesService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    paroquias = { criarConta: jest.fn().mockResolvedValue({ ok: true }) };
    service = new ImplantacoesService(
      prisma as unknown as PrismaService,
      paroquias as unknown as ParoquiasService,
    );
  });

  describe('criar', () => {
    it('cria a paróquia afilhada sem conta e o vínculo em SEMENTEIRA', async () => {
      prisma.paroquia.findUnique.mockResolvedValue({ id: 'madrinha', nome: 'Paróquia Y' });
      prisma.implantacao.findFirst.mockResolvedValue(null);

      await service.criar({ afilhadaNome: '  Paróquia X ', madrinhaId: 'madrinha' }, 'conselho-1');

      expect(prisma.tx.paroquia.create).toHaveBeenCalledWith({ data: { nome: 'Paróquia X' } });
      expect(prisma.tx.implantacao.create).toHaveBeenCalledWith({
        data: { madrinhaId: 'madrinha', afilhadaId: 'afilhada', criadaPorId: 'conselho-1' },
      });
    });

    it('madrinha inexistente → 404', async () => {
      prisma.paroquia.findUnique.mockResolvedValue(null);
      await expect(
        service.criar({ afilhadaNome: 'X', madrinhaId: 'nada' }, 'conselho-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('madrinha que ainda é afilhada num vínculo não encerrado → 409', async () => {
      prisma.paroquia.findUnique.mockResolvedValue({ id: 'madrinha', nome: 'Paróquia Y' });
      prisma.implantacao.findFirst.mockResolvedValue(vinculo('ACOMPANHAMENTO'));
      await expect(
        service.criar({ afilhadaNome: 'X', madrinhaId: 'madrinha' }, 'conselho-1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.tx.paroquia.create).not.toHaveBeenCalled();
    });
  });

  describe('iniciarImplantacao', () => {
    it('transfere só as fichas desse vínculo que são da madrinha e muda a fase', async () => {
      prisma.implantacao.findUnique.mockResolvedValue(vinculo('SEMENTEIRA'));

      const resultado = await service.iniciarImplantacao('i1');

      expect(prisma.tx.ficha.updateMany).toHaveBeenCalledWith({
        where: { sementeiraDeId: 'i1', paroquiaId: 'madrinha' },
        data: { paroquiaId: 'afilhada' },
      });
      expect(prisma.tx.implantacao.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { fase: 'IMPLANTACAO', implantacaoIniciadaEm: expect.any(Date) },
      });
      expect(resultado).toEqual({ transferidas: 2 });
    });

    it('fora de SEMENTEIRA → 400 sem transferir', async () => {
      prisma.implantacao.findUnique.mockResolvedValue(vinculo('IMPLANTACAO'));
      await expect(service.iniciarImplantacao('i1')).rejects.toThrow(BadRequestException);
      expect(prisma.tx.ficha.updateMany).not.toHaveBeenCalled();
    });

    it('vínculo inexistente → 404', async () => {
      prisma.implantacao.findUnique.mockResolvedValue(null);
      await expect(service.iniciarImplantacao('i1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('fases seguintes', () => {
    it('passa de IMPLANTACAO para ACOMPANHAMENTO', async () => {
      prisma.implantacao.findUnique.mockResolvedValue(vinculo('IMPLANTACAO'));
      await service.passarParaAcompanhamento('i1');
      expect(prisma.tx.implantacao.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { fase: 'ACOMPANHAMENTO', acompanhamentoIniciadoEm: expect.any(Date) },
      });
    });

    it('encerrar a partir de IMPLANTACAO → 400 (precisa passar pelo acompanhamento)', async () => {
      prisma.implantacao.findUnique.mockResolvedValue(vinculo('IMPLANTACAO'));
      await expect(service.encerrar('i1')).rejects.toThrow(BadRequestException);
    });

    it('encerra a partir de ACOMPANHAMENTO', async () => {
      prisma.implantacao.findUnique.mockResolvedValue(vinculo('ACOMPANHAMENTO'));
      await service.encerrar('i1');
      expect(prisma.tx.implantacao.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { fase: 'ENCERRADA', encerradaEm: expect.any(Date) },
      });
    });
  });

  describe('liberarAcesso', () => {
    it('na SEMENTEIRA → 400 (a conta da afilhada sai a partir da implantação)', async () => {
      prisma.implantacao.findUnique.mockResolvedValue(vinculo('SEMENTEIRA'));
      await expect(service.liberarAcesso('i1', 'x@gmail.com')).rejects.toThrow(BadRequestException);
      expect(paroquias.criarConta).not.toHaveBeenCalled();
    });

    it('cria a conta da afilhada pelo fluxo de paróquia', async () => {
      prisma.implantacao.findUnique.mockResolvedValue(vinculo('IMPLANTACAO'));
      await service.liberarAcesso('i1', 'x@gmail.com');
      expect(paroquias.criarConta).toHaveBeenCalledWith('afilhada', 'x@gmail.com');
    });
  });

  describe('listar', () => {
    it('devolve paróquias, fase, se a afilhada tem conta e só a contagem de fichas (R8)', async () => {
      prisma.implantacao.findMany.mockResolvedValue([
        {
          ...vinculo('SEMENTEIRA'),
          createdAt: new Date('2026-11-01'),
          implantacaoIniciadaEm: null,
          acompanhamentoIniciadoEm: null,
          encerradaEm: null,
          madrinha: { id: 'madrinha', nome: 'Paróquia Y' },
          afilhada: { id: 'afilhada', nome: 'Paróquia X', usuarios: [] },
          _count: { fichasSementeira: 24 },
        },
      ]);

      const [item] = await service.listar();

      expect(item).toEqual({
        id: 'i1',
        fase: 'SEMENTEIRA',
        madrinha: { id: 'madrinha', nome: 'Paróquia Y' },
        afilhada: { id: 'afilhada', nome: 'Paróquia X' },
        afilhadaTemConta: false,
        fichasSementeira: 24,
        createdAt: new Date('2026-11-01'),
        implantacaoIniciadaEm: null,
        acompanhamentoIniciadoEm: null,
        encerradaEm: null,
      });
    });
  });
});
