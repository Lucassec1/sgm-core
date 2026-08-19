import { BadRequestException } from '@nestjs/common';
import { MontagensService } from './montagens.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';

// Testes unitários das regras R3 (filtro de fichas ativas na sugestão de coordenadores), R5
// (prioridade de convite) e R6 (validação de tamanho do encontro) na MontagensService.
// PrismaService é totalmente mockado.

const PAROQUIA_ID = 'paroquia-1';
const MONTAGEM_ID = 'montagem-1';

function criarPrismaMock() {
  return {
    montagem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cargo: { findMany: jest.fn() },
    vagaMontagem: { createMany: jest.fn(), update: jest.fn() },
    ficha: { findMany: jest.fn() },
    fichaCasal: { findMany: jest.fn() },
    equipe: { findUnique: jest.fn() },
    alocacao: { findMany: jest.fn() },
  };
}

describe('MontagensService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let logAtividade: { registrar: jest.Mock; listar: jest.Mock };
  let service: MontagensService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    logAtividade = { registrar: jest.fn().mockResolvedValue(undefined), listar: jest.fn() };
    service = new MontagensService(prisma as unknown as PrismaService, logAtividade as unknown as LogAtividadeService);
  });

  describe('create — R6 (tamanho do encontro)', () => {
    it('rejeita abaixo de 40 jovens', async () => {
      await expect(
        service.create({ paroquiaId: PAROQUIA_ID, data: '2026-09-10', numeroJovensVivenciando: 39 } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.montagem.create).not.toHaveBeenCalled();
    });

    it('rejeita acima de 60 quando não é implantação', async () => {
      await expect(
        service.create({ paroquiaId: PAROQUIA_ID, data: '2026-09-10', numeroJovensVivenciando: 61 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite até 72 quando é implantação (60 locais + 12 sementeira)', async () => {
      prisma.montagem.findFirst.mockResolvedValue(null);
      prisma.cargo.findMany.mockResolvedValue([]);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID });
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, vagas: [] });

      await service.create({
        paroquiaId: PAROQUIA_ID,
        data: '2026-09-10',
        numeroJovensVivenciando: 72,
        ehImplantacao: true,
      } as any);
      expect(prisma.montagem.create).toHaveBeenCalled();
    });

    it('rejeita acima de 72 mesmo sendo implantação', async () => {
      await expect(
        service.create({
          paroquiaId: PAROQUIA_ID,
          data: '2026-09-10',
          numeroJovensVivenciando: 73,
          ehImplantacao: true,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita abaixo de 52 quando é implantação (40 locais + 12 sementeira)', async () => {
      await expect(
        service.create({
          paroquiaId: PAROQUIA_ID,
          data: '2026-09-10',
          numeroJovensVivenciando: 51,
          ehImplantacao: true,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create — cálculo da Visitação na implantação', () => {
    it('desconta os 12 sementeira e soma os 4 casais afilhados', async () => {
      prisma.montagem.findFirst.mockResolvedValue(null);
      prisma.cargo.findMany.mockResolvedValue([
        { id: 'cargo-visitacao', equipeId: 'equipe-visitacao', quantidadeDinamica: true, quantidadeCasais: 0, quantidadeRapazes: 0, quantidadeMocas: 0 },
      ]);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID });
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, vagas: [] });

      // 72 jovens totais (60 locais + 12 sementeira) -> ceil(60/3) + 4 = 24 casais
      await service.create({
        paroquiaId: PAROQUIA_ID,
        data: '2026-09-10',
        numeroJovensVivenciando: 72,
        ehImplantacao: true,
      } as any);

      const { data } = prisma.vagaMontagem.createMany.mock.calls[0][0];
      expect(data.find((v: any) => v.cargoId === 'cargo-visitacao').quantidadeCasais).toBe(24);
    });
  });

  describe('create — numeração e vagas', () => {
    it('numeroEncontro = último da paróquia + 1', async () => {
      prisma.montagem.findFirst.mockResolvedValue({ numeroEncontro: 4 });
      prisma.cargo.findMany.mockResolvedValue([]);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID });
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, vagas: [] });

      await service.create({ paroquiaId: PAROQUIA_ID, data: '2026-09-10', numeroJovensVivenciando: 40 } as any);

      expect(prisma.montagem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ numeroEncontro: 5 }) }),
      );
    });

    it('calcula casais da Visitação dinamicamente (~1 casal a cada 3 jovens)', async () => {
      prisma.montagem.findFirst.mockResolvedValue(null);
      prisma.cargo.findMany.mockResolvedValue([
        { id: 'cargo-visitacao', equipeId: 'equipe-visitacao', quantidadeDinamica: true, quantidadeCasais: 0, quantidadeRapazes: 0, quantidadeMocas: 0 },
        { id: 'cargo-fixo', equipeId: 'equipe-x', quantidadeDinamica: false, quantidadeCasais: 1, quantidadeRapazes: 2, quantidadeMocas: 2 },
      ]);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID });
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, vagas: [] });

      await service.create({ paroquiaId: PAROQUIA_ID, data: '2026-09-10', numeroJovensVivenciando: 40 } as any);

      const { data } = prisma.vagaMontagem.createMany.mock.calls[0][0];
      expect(data.find((v: any) => v.cargoId === 'cargo-visitacao').quantidadeCasais).toBe(14); // ceil(40/3)
      expect(data.find((v: any) => v.cargoId === 'cargo-fixo').quantidadeCasais).toBe(1);
    });
  });

  describe('update — recalcula a Visitação quando numeroJovensVivenciando/ehImplantacao mudam', () => {
    it('recalcula a vaga dinâmica quando numeroJovensVivenciando muda', async () => {
      const vagaDinamica = { id: 'vaga-visitacao', cargo: { quantidadeDinamica: true } };
      prisma.montagem.findUnique
        .mockResolvedValueOnce({ id: MONTAGEM_ID, status: 'EM_ANDAMENTO', numeroJovensVivenciando: 40, ehImplantacao: false, vagas: [] })
        .mockResolvedValueOnce({ id: MONTAGEM_ID, status: 'EM_ANDAMENTO', numeroJovensVivenciando: 57, ehImplantacao: false, vagas: [vagaDinamica] });
      prisma.montagem.update.mockResolvedValue({ id: MONTAGEM_ID, vagas: [vagaDinamica] });

      await service.update(MONTAGEM_ID, { numeroJovensVivenciando: 57 } as any);

      expect(prisma.vagaMontagem.update).toHaveBeenCalledWith({
        where: { id: 'vaga-visitacao' },
        data: { quantidadeCasais: 19 }, // ceil(57/3)
      });
    });

    it('rejeita numeroJovensVivenciando fora do intervalo válido pro estado atual', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, status: 'EM_ANDAMENTO', numeroJovensVivenciando: 40, ehImplantacao: true, vagas: [] });

      await expect(service.update(MONTAGEM_ID, { numeroJovensVivenciando: 51 } as any)).rejects.toThrow(BadRequestException);
      expect(prisma.montagem.update).not.toHaveBeenCalled();
    });

    it('não mexe na vaga dinâmica quando nenhum dos dois campos muda', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, status: 'EM_ANDAMENTO', numeroJovensVivenciando: 40, ehImplantacao: false, vagas: [] });
      prisma.montagem.update.mockResolvedValue({ id: MONTAGEM_ID, vagas: [] });

      await service.update(MONTAGEM_ID, { padroeiro: 'Nova Senhora' } as any);

      expect(prisma.vagaMontagem.update).not.toHaveBeenCalled();
    });
  });

  describe('candidatosJovens — R5', () => {
    it('prioriza o encontro imediatamente anterior e ordena os demais de forma decrescente', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID, numeroEncontro: 7, vagas: [] });
      prisma.alocacao.findMany.mockResolvedValue([]);
      prisma.ficha.findMany.mockResolvedValue([
        { id: 'f-encontro-4', numeroEncontro: 4 },
        { id: 'f-encontro-6', numeroEncontro: 6 },
        { id: 'f-encontro-5-a', numeroEncontro: 5 },
        { id: 'f-encontro-5-b', numeroEncontro: 5 },
      ]);

      const candidatos = await service.candidatosJovens(MONTAGEM_ID);
      // montagem.numeroEncontro = 7 -> encontro imediatamente anterior = 6
      expect(candidatos.map((f) => f.id)).toEqual(['f-encontro-6', 'f-encontro-5-a', 'f-encontro-5-b', 'f-encontro-4']);
    });

    it('exclui fichas já RECUSADO/DESISTIU nesta montagem', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID, numeroEncontro: 7, vagas: [] });
      prisma.alocacao.findMany.mockResolvedValue([{ fichaId: 'f-excluida' }]);
      prisma.ficha.findMany.mockResolvedValue([{ id: 'f-ok', numeroEncontro: 6 }]);

      await service.candidatosJovens(MONTAGEM_ID);

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { notIn: ['f-excluida'] }, situacao: 'ATIVA' }) }),
      );
    });

    it('sem vagaMontagemId, não filtra por sexo', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID, numeroEncontro: 7, vagas: [] });
      prisma.alocacao.findMany.mockResolvedValue([]);
      prisma.ficha.findMany.mockResolvedValue([]);

      await service.candidatosJovens(MONTAGEM_ID);

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ sexo: expect.anything() }) }),
      );
    });

    it('com vagaMontagemId de vaga só de rapazes, filtra sexo RAPAZ', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 7,
        vagas: [{ id: 'vaga-1', quantidadeRapazes: 2, quantidadeMocas: 0 }],
      });
      prisma.alocacao.findMany.mockResolvedValue([]);
      prisma.ficha.findMany.mockResolvedValue([]);

      await service.candidatosJovens(MONTAGEM_ID, 'vaga-1');

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sexo: { in: ['RAPAZ'] } }) }),
      );
    });

    it('rejeita vagaMontagemId que não pertence à montagem', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID, numeroEncontro: 7, vagas: [] });

      await expect(service.candidatosJovens(MONTAGEM_ID, 'vaga-inexistente')).rejects.toThrow(BadRequestException);
      expect(prisma.ficha.findMany).not.toHaveBeenCalled();
    });
  });

  describe('coordenadoresSugeridos — filtro de fichas ATIVA', () => {
    it('só busca fichas/casais com situacao ATIVA em todos os grupos', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, vagas: [] });
      prisma.equipe.findUnique.mockResolvedValue({ id: 'equipe-1', slug: 'animacao' });
      prisma.ficha.findMany.mockResolvedValue([]);
      prisma.fichaCasal.findMany.mockResolvedValue([]);

      await service.coordenadoresSugeridos(MONTAGEM_ID, 'equipe-1');

      for (const call of prisma.ficha.findMany.mock.calls) {
        expect(call[0].where.situacao).toBe('ATIVA');
      }
      for (const call of prisma.fichaCasal.findMany.mock.calls) {
        expect(call[0].where.situacao).toBe('ATIVA');
      }
    });
  });

  describe('listarLog', () => {
    it('delega pro LogAtividadeService depois de confirmar que a montagem existe', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, vagas: [] });
      logAtividade.listar.mockResolvedValue([{ acao: 'CRIOU_MONTAGEM' }]);

      const log = await service.listarLog(MONTAGEM_ID);
      expect(logAtividade.listar).toHaveBeenCalledWith(MONTAGEM_ID);
      expect(log).toEqual([{ acao: 'CRIOU_MONTAGEM' }]);
    });
  });
});
