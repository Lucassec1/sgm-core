import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MontagensService } from './montagens.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';

// Testes unitários das regras R3 (filtro de fichas ativas na sugestão de coordenadores), R5
// (prioridade de convite), R6 (validação de tamanho do encontro) e R7 (isolamento por
// paróquia — garantirPertence) na MontagensService. PrismaService é totalmente mockado.

const PAROQUIA_ID = 'paroquia-1';
const OUTRA_PAROQUIA_ID = 'paroquia-2';
const MONTAGEM_ID = 'montagem-1';

function criarPrismaMock() {
  const mock: Record<string, unknown> = {
    montagem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cargo: { findMany: jest.fn() },
    vagaMontagem: { createMany: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    ficha: { findMany: jest.fn() },
    fichaCasal: { findMany: jest.fn() },
    equipe: { findUnique: jest.fn() },
    alocacao: { findMany: jest.fn(), count: jest.fn() },
    logAtividade: { findMany: jest.fn(), findFirst: jest.fn() },
  };
  // Passthrough: roda o callback com o próprio mock no lugar do client transacional.
  mock.$transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: unknown) => unknown)(mock)
      : Promise.all(arg as unknown[]),
  );
  return mock as Record<string, any>;
}

describe('MontagensService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let logAtividade: { registrar: jest.Mock; listar: jest.Mock };
  let service: MontagensService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    logAtividade = { registrar: jest.fn().mockResolvedValue(undefined), listar: jest.fn() };
    service = new MontagensService(
      prisma as unknown as PrismaService,
      logAtividade as unknown as LogAtividadeService,
    );
  });

  describe('create — R6 (tamanho do encontro)', () => {
    it('rejeita abaixo de 40 jovens', async () => {
      await expect(
        service.create({ data: '2026-09-10', numeroJovensVivenciando: 39 } as any, PAROQUIA_ID),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.montagem.create).not.toHaveBeenCalled();
    });

    it('rejeita acima de 60 quando não é implantação', async () => {
      await expect(
        service.create({ data: '2026-09-10', numeroJovensVivenciando: 61 } as any, PAROQUIA_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite até 72 quando é implantação (60 locais + 12 sementeira)', async () => {
      prisma.montagem.findFirst.mockResolvedValue(null);
      prisma.cargo.findMany.mockResolvedValue([]);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID });
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      await service.create(
        {
          data: '2026-09-10',
          numeroJovensVivenciando: 72,
          ehImplantacao: true,
        } as any,
        PAROQUIA_ID,
      );
      expect(prisma.montagem.create).toHaveBeenCalled();
    });

    it('rejeita acima de 72 mesmo sendo implantação', async () => {
      await expect(
        service.create(
          {
            data: '2026-09-10',
            numeroJovensVivenciando: 73,
            ehImplantacao: true,
          } as any,
          PAROQUIA_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita abaixo de 52 quando é implantação (40 locais + 12 sementeira)', async () => {
      await expect(
        service.create(
          {
            data: '2026-09-10',
            numeroJovensVivenciando: 51,
            ehImplantacao: true,
          } as any,
          PAROQUIA_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create — cálculo da Visitação na implantação', () => {
    it('desconta os 12 sementeira e soma os 4 casais afilhados', async () => {
      prisma.montagem.findFirst.mockResolvedValue(null);
      prisma.cargo.findMany.mockResolvedValue([
        {
          id: 'cargo-visitacao',
          equipeId: 'equipe-visitacao',
          quantidadeDinamica: true,
          quantidadeCasais: 0,
          quantidadeRapazes: 0,
          quantidadeMocas: 0,
        },
      ]);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID });
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      // 72 jovens totais (60 locais + 12 sementeira) -> ceil(60/3) + 4 = 24 casais
      await service.create(
        {
          data: '2026-09-10',
          numeroJovensVivenciando: 72,
          ehImplantacao: true,
        } as any,
        PAROQUIA_ID,
      );

      const { data } = prisma.vagaMontagem.createMany.mock.calls[0][0];
      expect(data.find((v: any) => v.cargoId === 'cargo-visitacao').quantidadeCasais).toBe(24);
    });
  });

  describe('create — numeração e vagas', () => {
    it('numeroEncontro = último da paróquia + 1', async () => {
      prisma.montagem.findFirst.mockResolvedValue({ numeroEncontro: 4 });
      prisma.cargo.findMany.mockResolvedValue([]);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID });
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      await service.create({ data: '2026-09-10', numeroJovensVivenciando: 40 } as any, PAROQUIA_ID);

      expect(prisma.montagem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ numeroEncontro: 5, paroquiaId: PAROQUIA_ID }),
        }),
      );
    });

    it('calcula casais da Visitação dinamicamente (~1 casal a cada 3 jovens)', async () => {
      prisma.montagem.findFirst.mockResolvedValue(null);
      prisma.cargo.findMany.mockResolvedValue([
        {
          id: 'cargo-visitacao',
          equipeId: 'equipe-visitacao',
          quantidadeDinamica: true,
          quantidadeCasais: 0,
          quantidadeRapazes: 0,
          quantidadeMocas: 0,
        },
        {
          id: 'cargo-fixo',
          equipeId: 'equipe-x',
          quantidadeDinamica: false,
          quantidadeCasais: 1,
          quantidadeRapazes: 2,
          quantidadeMocas: 2,
        },
      ]);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID });
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      await service.create({ data: '2026-09-10', numeroJovensVivenciando: 40 } as any, PAROQUIA_ID);

      const { data } = prisma.vagaMontagem.createMany.mock.calls[0][0];
      expect(data.find((v: any) => v.cargoId === 'cargo-visitacao').quantidadeCasais).toBe(14); // ceil(40/3)
      expect(data.find((v: any) => v.cargoId === 'cargo-fixo').quantidadeCasais).toBe(1);
    });
  });

  describe('update — recalcula a Visitação quando numeroJovensVivenciando/ehImplantacao mudam', () => {
    it('recalcula a vaga dinâmica quando numeroJovensVivenciando muda', async () => {
      const vagaDinamica = { id: 'vaga-visitacao', cargo: { quantidadeDinamica: true } };
      prisma.montagem.findUnique
        .mockResolvedValueOnce({
          id: MONTAGEM_ID,
          paroquiaId: PAROQUIA_ID,
          status: 'EM_ANDAMENTO',
          numeroJovensVivenciando: 40,
          ehImplantacao: false,
          vagas: [],
        })
        .mockResolvedValueOnce({
          id: MONTAGEM_ID,
          paroquiaId: PAROQUIA_ID,
          status: 'EM_ANDAMENTO',
          numeroJovensVivenciando: 57,
          ehImplantacao: false,
          vagas: [vagaDinamica],
        });
      prisma.montagem.update.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [vagaDinamica],
      });

      await service.update(MONTAGEM_ID, { numeroJovensVivenciando: 57 } as any, PAROQUIA_ID);

      expect(prisma.vagaMontagem.update).toHaveBeenCalledWith({
        where: { id: 'vaga-visitacao' },
        data: { quantidadeCasais: 19 }, // ceil(57/3)
      });
    });

    it('rejeita numeroJovensVivenciando fora do intervalo válido pro estado atual', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        status: 'EM_ANDAMENTO',
        numeroJovensVivenciando: 40,
        ehImplantacao: true,
        vagas: [],
      });

      await expect(
        service.update(MONTAGEM_ID, { numeroJovensVivenciando: 51 } as any, PAROQUIA_ID),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.montagem.update).not.toHaveBeenCalled();
    });

    it('não mexe na vaga dinâmica quando nenhum dos dois campos muda', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        status: 'EM_ANDAMENTO',
        numeroJovensVivenciando: 40,
        ehImplantacao: false,
        vagas: [],
      });
      prisma.montagem.update.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      await service.update(MONTAGEM_ID, { padroeiro: 'Nova Senhora' } as any, PAROQUIA_ID);

      expect(prisma.vagaMontagem.update).not.toHaveBeenCalled();
    });

    it('normaliza a data quando dto.data é informado', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        status: 'EM_ANDAMENTO',
        numeroJovensVivenciando: 40,
        ehImplantacao: false,
        vagas: [],
      });
      prisma.montagem.update.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      await service.update(MONTAGEM_ID, { data: '2026-10-01' } as any, PAROQUIA_ID);

      expect(prisma.montagem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ data: new Date('2026-10-01') }),
        }),
      );
    });

    it('grava quantidadeJovensSementeira/quantidadeCasaisAfilhada quando ehImplantacao muda pra true', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        status: 'EM_ANDAMENTO',
        numeroJovensVivenciando: 52,
        ehImplantacao: false,
        vagas: [],
      });
      prisma.montagem.update.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      await service.update(MONTAGEM_ID, { ehImplantacao: true } as any, PAROQUIA_ID);

      expect(prisma.montagem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantidadeJovensSementeira: 12,
            quantidadeCasaisAfilhada: 4,
          }),
        }),
      );
    });
  });

  describe('R7 — isolamento por paróquia (garantirPertence)', () => {
    it('findOne lança NotFoundException quando a montagem é de outra paróquia', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: OUTRA_PAROQUIA_ID,
        vagas: [],
      });

      await expect(service.findOne(MONTAGEM_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('findOne lança NotFoundException quando a montagem não existe', async () => {
      prisma.montagem.findUnique.mockResolvedValue(null);

      await expect(service.findOne(MONTAGEM_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('findOne retorna normalmente quando a montagem pertence à paróquia', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      const montagem = await service.findOne(MONTAGEM_ID, PAROQUIA_ID);
      expect(montagem.id).toBe(MONTAGEM_ID);
    });
  });

  describe('candidatosJovens — R5', () => {
    it('prioriza o encontro imediatamente anterior e ordena os demais de forma decrescente', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 7,
        vagas: [],
      });
      prisma.alocacao.findMany.mockResolvedValue([]);
      prisma.ficha.findMany.mockResolvedValue([
        { id: 'f-encontro-4', numeroEncontro: 4 },
        { id: 'f-encontro-6', numeroEncontro: 6 },
        { id: 'f-encontro-5-a', numeroEncontro: 5 },
        { id: 'f-encontro-5-b', numeroEncontro: 5 },
      ]);

      const candidatos = await service.candidatosJovens(MONTAGEM_ID, PAROQUIA_ID);
      // montagem.numeroEncontro = 7 -> encontro imediatamente anterior = 6
      expect(candidatos.map((f) => f.id)).toEqual([
        'f-encontro-6',
        'f-encontro-5-a',
        'f-encontro-5-b',
        'f-encontro-4',
      ]);
    });

    it('exclui fichas já RECUSADO/DESISTIU nesta montagem', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 7,
        vagas: [],
      });
      prisma.alocacao.findMany.mockResolvedValue([{ fichaId: 'f-excluida' }]);
      prisma.ficha.findMany.mockResolvedValue([{ id: 'f-ok', numeroEncontro: 6 }]);

      await service.candidatosJovens(MONTAGEM_ID, PAROQUIA_ID);

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { notIn: ['f-excluida'] }, situacao: 'ATIVA' }),
        }),
      );
    });

    it('sem vagaMontagemId, não filtra por sexo', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 7,
        vagas: [],
      });
      prisma.alocacao.findMany.mockResolvedValue([]);
      prisma.ficha.findMany.mockResolvedValue([]);

      await service.candidatosJovens(MONTAGEM_ID, PAROQUIA_ID);

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ sexo: expect.anything() }),
        }),
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

      await service.candidatosJovens(MONTAGEM_ID, PAROQUIA_ID, 'vaga-1');

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sexo: { in: ['RAPAZ'] } }) }),
      );
    });

    it('com vagaMontagemId de vaga só de moças, filtra sexo MOCA', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 7,
        vagas: [{ id: 'vaga-1', quantidadeRapazes: 0, quantidadeMocas: 3 }],
      });
      prisma.alocacao.findMany.mockResolvedValue([]);
      prisma.ficha.findMany.mockResolvedValue([]);

      await service.candidatosJovens(MONTAGEM_ID, PAROQUIA_ID, 'vaga-1');

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sexo: { in: ['MOCA'] } }) }),
      );
    });

    it('rejeita vagaMontagemId que não pertence à montagem', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 7,
        vagas: [],
      });

      await expect(
        service.candidatosJovens(MONTAGEM_ID, PAROQUIA_ID, 'vaga-inexistente'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.ficha.findMany).not.toHaveBeenCalled();
    });
  });

  describe('coordenadoresSugeridos — filtro de fichas ATIVA', () => {
    it('só busca fichas/casais com situacao ATIVA em todos os grupos', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });
      prisma.equipe.findUnique.mockResolvedValue({ id: 'equipe-1', slug: 'animacao' });
      prisma.ficha.findMany.mockResolvedValue([]);
      prisma.fichaCasal.findMany.mockResolvedValue([]);

      await service.coordenadoresSugeridos(MONTAGEM_ID, 'equipe-1', PAROQUIA_ID);

      for (const call of prisma.ficha.findMany.mock.calls) {
        expect(call[0].where.situacao).toBe('ATIVA');
      }
      for (const call of prisma.fichaCasal.findMany.mock.calls) {
        expect(call[0].where.situacao).toBe('ATIVA');
      }
    });

    it('não busca fichas do Comando Geral quando essa equipe não existe no cadastro', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });
      prisma.equipe.findUnique
        .mockResolvedValueOnce({ id: 'equipe-1', slug: 'animacao' })
        .mockResolvedValueOnce(null); // busca por slug 'comando-geral' não encontra
      prisma.ficha.findMany.mockResolvedValue([]);
      prisma.fichaCasal.findMany.mockResolvedValue([]);

      const resultado = await service.coordenadoresSugeridos(MONTAGEM_ID, 'equipe-1', PAROQUIA_ID);

      // 2 chamadas de ficha.findMany (grupoA + dirigentes), não 3 (sem comando geral)
      expect(prisma.ficha.findMany).toHaveBeenCalledTimes(2);
      expect(resultado.grupoB.fichas).toEqual([]);
    });
  });

  describe('resumo — proposta #2 (painel "como foi esse encontro")', () => {
    beforeEach(() => {
      prisma.alocacao.count.mockResolvedValue(0);
      prisma.logAtividade.findMany.mockResolvedValue([]);
      prisma.logAtividade.findFirst.mockResolvedValue(null);
      prisma.montagem.findMany.mockResolvedValue([]);
    });

    it('duracaoMs é null quando a montagem ainda não foi finalizada', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 5,
        status: 'EM_ANDAMENTO',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        vagas: [],
      });

      const resumo = await service.resumo(MONTAGEM_ID, PAROQUIA_ID);

      expect(resumo.duracaoMs).toBeNull();
      expect(prisma.logAtividade.findFirst).not.toHaveBeenCalled();
    });

    it('duracaoMs = tempo entre a criação e a finalização mais recente (MUDOU_STATUS -> FINALIZADA)', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 5,
        status: 'FINALIZADA',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        vagas: [],
      });
      prisma.logAtividade.findFirst.mockResolvedValue({
        createdAt: new Date('2026-01-03T00:00:00Z'),
      });

      const resumo = await service.resumo(MONTAGEM_ID, PAROQUIA_ID);

      expect(resumo.duracaoMs).toBe(2 * 24 * 60 * 60 * 1000);
      expect(prisma.logAtividade.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            montagemId: MONTAGEM_ID,
            acao: 'MUDOU_STATUS',
            detalhes: { endsWith: '-> FINALIZADA' },
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('equipeMaisMovimentada conta CRIOU_ALOCACAO + REMOVEU_ALOCACAO por equipe (extraída do detalhes)', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 5,
        status: 'EM_ANDAMENTO',
        createdAt: new Date(),
        vagas: [],
      });
      prisma.logAtividade.findMany.mockResolvedValue([
        { detalhes: 'Eq. da Cozinha / Componentes' },
        { detalhes: 'Eq. da Cozinha / Componentes' },
        { detalhes: 'Eq. da Animação / Componentes' },
      ]);

      const resumo = await service.resumo(MONTAGEM_ID, PAROQUIA_ID);

      expect(resumo.equipeMaisMovimentada).toEqual({ nome: 'Eq. da Cozinha', movimentacoes: 2 });
    });

    it('equipeMaisMovimentada é null quando não há nenhuma movimentação', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 5,
        status: 'EM_ANDAMENTO',
        createdAt: new Date(),
        vagas: [],
      });

      const resumo = await service.resumo(MONTAGEM_ID, PAROQUIA_ID);

      expect(resumo.equipeMaisMovimentada).toBeNull();
    });

    it('ignora logs sem equipe extraível do detalhes (detalhes nulo)', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 5,
        status: 'EM_ANDAMENTO',
        createdAt: new Date(),
        vagas: [],
      });
      prisma.logAtividade.findMany.mockResolvedValue([
        { detalhes: null },
        { detalhes: 'Eq. da Cozinha / Componentes' },
      ]);

      const resumo = await service.resumo(MONTAGEM_ID, PAROQUIA_ID);

      expect(resumo.equipeMaisMovimentada).toEqual({ nome: 'Eq. da Cozinha', movimentacoes: 1 });
    });

    it('duracaoMs é null quando a montagem está FINALIZADA mas não há log de MUDOU_STATUS', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 5,
        status: 'FINALIZADA',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        vagas: [],
      });
      prisma.logAtividade.findFirst.mockResolvedValue(null);

      const resumo = await service.resumo(MONTAGEM_ID, PAROQUIA_ID);

      expect(resumo.duracaoMs).toBeNull();
    });

    it('totalRecusasDesistencias e totalSubstituicoes vêm da contagem de Alocacao por status', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 5,
        status: 'EM_ANDAMENTO',
        createdAt: new Date(),
        vagas: [],
      });
      prisma.alocacao.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      const resumo = await service.resumo(MONTAGEM_ID, PAROQUIA_ID);

      expect(resumo.totalRecusasDesistencias).toBe(3);
      expect(resumo.totalSubstituicoes).toBe(2);
      expect(prisma.alocacao.count).toHaveBeenNthCalledWith(1, {
        where: {
          vagaMontagem: { montagemId: MONTAGEM_ID },
          status: { in: ['RECUSADO', 'DESISTIU'] },
        },
      });
      expect(prisma.alocacao.count).toHaveBeenNthCalledWith(2, {
        where: { vagaMontagem: { montagemId: MONTAGEM_ID }, status: 'SUBSTITUIDO' },
      });
    });

    it('historico busca até 3 encontros FINALIZADA anteriores da mesma paróquia, do mais antigo pro mais novo', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 5,
        status: 'EM_ANDAMENTO',
        createdAt: new Date(),
        vagas: [],
      });
      prisma.montagem.findMany.mockResolvedValue([
        {
          id: 'm-4',
          numeroEncontro: 4,
          createdAt: new Date('2025-12-01T00:00:00Z'),
          status: 'FINALIZADA',
        },
        {
          id: 'm-3',
          numeroEncontro: 3,
          createdAt: new Date('2025-11-01T00:00:00Z'),
          status: 'FINALIZADA',
        },
      ]);
      // historicoDuracao inverte pra ordem crescente (mais antigo primeiro) antes de mapear,
      // então a 1ª chamada de findFirst é pra m-3 e a 2ª é pra m-4.
      prisma.logAtividade.findFirst
        .mockResolvedValueOnce({ createdAt: new Date('2025-11-02T00:00:00Z') }) // m-3
        .mockResolvedValueOnce({ createdAt: new Date('2025-12-02T00:00:00Z') }); // m-4

      const resumo = await service.resumo(MONTAGEM_ID, PAROQUIA_ID);

      expect(prisma.montagem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { paroquiaId: PAROQUIA_ID, status: 'FINALIZADA', numeroEncontro: { lt: 5 } },
          orderBy: { numeroEncontro: 'desc' },
          take: 3,
        }),
      );
      expect(resumo.historico).toEqual([
        { numeroEncontro: 3, duracaoMs: 24 * 60 * 60 * 1000 },
        { numeroEncontro: 4, duracaoMs: 24 * 60 * 60 * 1000 },
      ]);
    });
  });

  describe('listarLog', () => {
    it('delega pro LogAtividadeService depois de confirmar que a montagem existe', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });
      logAtividade.listar.mockResolvedValue([{ acao: 'CRIOU_MONTAGEM' }]);

      const log = await service.listarLog(MONTAGEM_ID, PAROQUIA_ID);
      expect(logAtividade.listar).toHaveBeenCalledWith(MONTAGEM_ID);
      expect(log).toEqual([{ acao: 'CRIOU_MONTAGEM' }]);
    });

    it('R7 — lança NotFoundException (garantirPertence) quando a montagem é de outra paróquia', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: OUTRA_PAROQUIA_ID,
      });

      await expect(service.listarLog(MONTAGEM_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
      expect(logAtividade.listar).not.toHaveBeenCalled();
    });

    it('R7 — lança NotFoundException (garantirPertence) quando a montagem não existe', async () => {
      prisma.montagem.findUnique.mockResolvedValue(null);

      await expect(service.listarLog(MONTAGEM_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('pagina com page/pageSize padrão e filtra por paroquiaId', async () => {
      prisma.montagem.findMany.mockResolvedValue([{ id: MONTAGEM_ID }]);
      prisma.montagem.count.mockResolvedValue(1);

      const resultado = await service.findAll({} as any, PAROQUIA_ID);

      expect(prisma.montagem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paroquiaId: PAROQUIA_ID }, skip: 0, take: 20 }),
      );
      expect(resultado).toEqual({
        items: [{ id: MONTAGEM_ID }],
        total: 1,
        page: 1,
        pageSize: 20,
      });
    });

    it('aplica filtro de status e paginação customizada', async () => {
      prisma.montagem.findMany.mockResolvedValue([]);
      prisma.montagem.count.mockResolvedValue(0);

      await service.findAll({ status: 'FINALIZADA', page: 2, pageSize: 5 } as any, PAROQUIA_ID);

      expect(prisma.montagem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { paroquiaId: PAROQUIA_ID, status: 'FINALIZADA' },
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('exportCsv', () => {
    it('monta o CSV com equipe, cargo, pessoa (ficha ou casal) e status do convite', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID });
      prisma.vagaMontagem.findMany.mockResolvedValue([
        {
          equipe: { nome: 'Eq. da Cozinha' },
          cargo: { nome: 'Coordenador' },
          alocacoes: [
            { ficha: { nomeCompleto: 'Ana Silva' }, fichaCasal: null, status: 'ACEITO' },
            {
              ficha: null,
              fichaCasal: { nomeEle: 'João', nomeEla: 'Maria' },
              status: 'PENDENTE',
            },
          ],
        },
      ]);

      const csv = await service.exportCsv(MONTAGEM_ID, PAROQUIA_ID);

      expect(csv).toContain('Ana Silva;ACEITO');
      expect(csv).toContain('João e Maria;PENDENTE');
    });

    it('R7 — lança NotFoundException quando a montagem não pertence à paróquia', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: OUTRA_PAROQUIA_ID,
      });

      await expect(service.exportCsv(MONTAGEM_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.vagaMontagem.findMany).not.toHaveBeenCalled();
    });

    it('deixa a coluna Pessoa vazia quando a alocação não tem ficha nem casal', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID });
      prisma.vagaMontagem.findMany.mockResolvedValue([
        {
          equipe: { nome: 'Eq. da Cozinha' },
          cargo: { nome: 'Coordenador' },
          alocacoes: [{ ficha: null, fichaCasal: null, status: 'RASCUNHO' }],
        },
      ]);

      const csv = await service.exportCsv(MONTAGEM_ID, PAROQUIA_ID);

      expect(csv).toContain(';RASCUNHO');
    });
  });

  describe('update — log de MUDOU_STATUS quando o status muda', () => {
    it('registra MUDOU_STATUS com "<anterior> -> <novo>" quando o status é alterado', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        status: 'EM_ANDAMENTO',
        numeroJovensVivenciando: 40,
        ehImplantacao: false,
        vagas: [],
      });
      prisma.montagem.update.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      await service.update(
        MONTAGEM_ID,
        { status: 'FINALIZADA', usuario: 'Ana' } as any,
        PAROQUIA_ID,
      );

      expect(logAtividade.registrar).toHaveBeenCalledWith(
        MONTAGEM_ID,
        'Ana',
        'MUDOU_STATUS',
        'EM_ANDAMENTO -> FINALIZADA',
        prisma,
      );
    });
  });

  describe('coordenadoresSugeridos', () => {
    it('lança NotFoundException quando a equipe não existe', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });
      prisma.equipe.findUnique.mockResolvedValue(null);

      await expect(
        service.coordenadoresSugeridos(MONTAGEM_ID, 'equipe-inexistente', PAROQUIA_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('deduplica fichas que aparecem tanto no grupo B (dirigente) quanto no Comando Geral', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });
      prisma.equipe.findUnique
        .mockResolvedValueOnce({ id: 'equipe-1', slug: 'animacao' })
        .mockResolvedValueOnce({ id: 'equipe-comando-geral', slug: 'comando-geral' });
      prisma.ficha.findMany
        .mockResolvedValueOnce([]) // grupoAFichas
        .mockResolvedValueOnce([{ id: 'ficha-repetida' }]) // dirigentesFichas
        .mockResolvedValueOnce([{ id: 'ficha-repetida' }]); // comandoGeralFichas
      prisma.fichaCasal.findMany.mockResolvedValue([]);

      const resultado = await service.coordenadoresSugeridos(MONTAGEM_ID, 'equipe-1', PAROQUIA_ID);

      expect(resultado.grupoB.fichas).toEqual([{ id: 'ficha-repetida' }]);
    });
  });
});
