import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListaSubstituicaoService } from './lista-substituicao.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MontagensService } from './montagens.service';
import { LogAtividadeService } from './log-atividade.service';

// Testes unitários da lista geral de substituição (docs/ux-e-fluxos.md, seção 3) — "banco de
// backups" da Montagem, independente de vaga/equipe. PrismaService/MontagensService mockados.

const MONTAGEM_ID = 'montagem-1';

function criarPrismaMock() {
  return {
    listaSubstituicao: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('ListaSubstituicaoService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let montagensService: { findOne: jest.Mock };
  let logAtividade: { registrar: jest.Mock };
  let service: ListaSubstituicaoService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    montagensService = { findOne: jest.fn().mockResolvedValue({ id: MONTAGEM_ID }) };
    logAtividade = { registrar: jest.fn().mockResolvedValue(undefined) };
    service = new ListaSubstituicaoService(
      prisma as unknown as PrismaService,
      montagensService as unknown as MontagensService,
      logAtividade as unknown as LogAtividadeService,
    );
  });

  describe('create', () => {
    it('confirma que a montagem existe antes de criar', async () => {
      prisma.listaSubstituicao.create.mockResolvedValue({ id: 'item-1', ficha: { nomeCompleto: 'João' }, fichaCasal: null });

      await service.create(MONTAGEM_ID, { tipoPessoa: 'JOVEM', fichaId: 'ficha-1' } as any);

      expect(montagensService.findOne).toHaveBeenCalledWith(MONTAGEM_ID);
      expect(prisma.listaSubstituicao.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ montagemId: MONTAGEM_ID, fichaId: 'ficha-1' }) }),
      );
    });

    it('registra no log de atividade (R9) com o nome da pessoa', async () => {
      prisma.listaSubstituicao.create.mockResolvedValue({ id: 'item-1', ficha: { nomeCompleto: 'João Silva' }, fichaCasal: null });

      await service.create(MONTAGEM_ID, { tipoPessoa: 'JOVEM', fichaId: 'ficha-1', usuario: 'Ana' } as any);

      expect(logAtividade.registrar).toHaveBeenCalledWith(MONTAGEM_ID, 'Ana', 'ADICIONOU_LISTA_SUBSTITUICAO', 'João Silva');
    });

    it('traduz violação de unicidade (pessoa já está na lista) em ConflictException', async () => {
      prisma.listaSubstituicao.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicado', { code: 'P2002', clientVersion: '7.9.1' }),
      );

      await expect(service.create(MONTAGEM_ID, { tipoPessoa: 'JOVEM', fichaId: 'ficha-1' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('lista os itens da montagem em ordem de criação', async () => {
      prisma.listaSubstituicao.findMany.mockResolvedValue([{ id: 'item-1' }]);

      const itens = await service.findAll(MONTAGEM_ID);

      expect(montagensService.findOne).toHaveBeenCalledWith(MONTAGEM_ID);
      expect(prisma.listaSubstituicao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { montagemId: MONTAGEM_ID }, orderBy: { createdAt: 'asc' } }),
      );
      expect(itens).toEqual([{ id: 'item-1' }]);
    });
  });

  describe('remove', () => {
    it('remove e registra no log quando o item pertence à montagem', async () => {
      prisma.listaSubstituicao.findUnique.mockResolvedValue({
        id: 'item-1',
        montagemId: MONTAGEM_ID,
        ficha: { nomeCompleto: 'João' },
        fichaCasal: null,
      });

      await service.remove(MONTAGEM_ID, 'item-1');

      expect(prisma.listaSubstituicao.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
      expect(logAtividade.registrar).toHaveBeenCalledWith(MONTAGEM_ID, undefined, 'REMOVEU_LISTA_SUBSTITUICAO', 'João');
    });

    it('rejeita quando o item não existe ou é de outra montagem', async () => {
      prisma.listaSubstituicao.findUnique.mockResolvedValue({ id: 'item-1', montagemId: 'outra-montagem' });

      await expect(service.remove(MONTAGEM_ID, 'item-1')).rejects.toThrow(NotFoundException);
      expect(prisma.listaSubstituicao.delete).not.toHaveBeenCalled();
    });
  });
});
