import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Equipe, StatusConvite } from '@prisma/client';
import { AlocacoesService } from './alocacoes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';

// Testes unitários das regras R1-R4 e R9 (log + ocultar substituição) na AlocacoesService.
// PrismaService é totalmente mockado — cada teste controla o que cada query retorna,
// sem tocar em banco de dados. Ver docs/regras-imutaveis.md pro texto de cada regra.

const MONTAGEM_ID = 'montagem-1';
const VAGA_ID = 'vaga-1';

function equipeFake(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nome: 'Eq. da Animação',
    slug: 'animacao',
    ordem: 4,
    ehCirculos: false,
    repeticaoLimiteFlexivel: false,
    bloqueiaConvitePosCirculos: true,
    coordenacaoCasalExigeHistorico: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function cargoFake(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cargo-1',
    nome: 'Componentes',
    ehCoordenacao: false,
    ...overrides,
  };
}

function criarPrismaMock() {
  return {
    vagaMontagem: { findUnique: jest.fn() },
    alocacao: {
      findFirst: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ficha: { findUnique: jest.fn() },
    fichaCasal: { findUnique: jest.fn() },
    equipe: { findUnique: jest.fn() },
  };
}

describe('AlocacoesService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let logAtividade: { registrar: jest.Mock; listar: jest.Mock };
  let service: AlocacoesService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    logAtividade = { registrar: jest.fn().mockResolvedValue(undefined), listar: jest.fn() };
    service = new AlocacoesService(prisma as unknown as PrismaService, logAtividade as unknown as LogAtividadeService);

    // padrão "sem histórico nenhum" pras regras R2/R3, sobrescrito por teste quando precisar
    prisma.alocacao.count.mockResolvedValue(0);
    prisma.alocacao.findFirst.mockResolvedValue(null);
    prisma.alocacao.findMany.mockResolvedValue([]);
    prisma.equipe.findUnique.mockResolvedValue(equipeFake({ slug: 'comando-geral', id: 'comando-geral-id' }));
  });

  function mockVaga(equipe: Equipe, cargo: Record<string, unknown>) {
    prisma.vagaMontagem.findUnique.mockResolvedValue({
      id: VAGA_ID,
      montagemId: MONTAGEM_ID,
      equipe,
      cargo,
    });
  }

  describe('create — R1 (recusa/desistência bloqueia realocação)', () => {
    it('bloqueia quando a pessoa já tem RECUSADO/DESISTIU nesse encontro', async () => {
      mockVaga(equipeFake(), cargoFake());
      prisma.alocacao.findFirst.mockResolvedValue({ id: 'antiga', status: StatusConvite.RECUSADO });

      await expect(
        service.create(MONTAGEM_ID, { vagaMontagemId: VAGA_ID, tipoPessoa: 'JOVEM', fichaId: 'ficha-1' } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alocacao.create).not.toHaveBeenCalled();
    });

    it('permite quando não há bloqueio', async () => {
      mockVaga(equipeFake(), cargoFake());
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, { vagaMontagemId: VAGA_ID, tipoPessoa: 'JOVEM', fichaId: 'ficha-1' } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });
  });

  describe('create — R2 (repetição de equipe)', () => {
    it('exige confirmarRepeticao quando já serviu 1x ou mais', async () => {
      mockVaga(equipeFake(), cargoFake());
      prisma.alocacao.count.mockResolvedValue(1);

      await expect(
        service.create(MONTAGEM_ID, { vagaMontagemId: VAGA_ID, tipoPessoa: 'JOVEM', fichaId: 'ficha-1' } as any),
      ).rejects.toThrow(ConflictException);
      expect(prisma.alocacao.create).not.toHaveBeenCalled();
    });

    it('prossegue quando confirmarRepeticao: true', async () => {
      mockVaga(equipeFake(), cargoFake());
      prisma.alocacao.count.mockResolvedValue(1);
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        confirmarRepeticao: true,
      } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('bloqueia de verdade ao atingir 3x, mesmo confirmando', async () => {
      mockVaga(equipeFake({ repeticaoLimiteFlexivel: false }), cargoFake());
      prisma.alocacao.count.mockResolvedValue(3);

      await expect(
        service.create(MONTAGEM_ID, {
          vagaMontagemId: VAGA_ID,
          tipoPessoa: 'JOVEM',
          fichaId: 'ficha-1',
          confirmarRepeticao: true,
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alocacao.create).not.toHaveBeenCalled();
    });

    it('Eq. da Visitação nunca bloqueia de verdade, mesmo passando de 3x', async () => {
      mockVaga(equipeFake({ slug: 'visitacao', repeticaoLimiteFlexivel: true }), cargoFake());
      prisma.alocacao.count.mockResolvedValue(5);
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'CASAL',
        fichaCasalId: 'casal-1',
        confirmarRepeticao: true,
      } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });
  });

  describe('create — R3 (coordenação)', () => {
    const equipeAnimacao = equipeFake({ id: 'animacao-id' });
    const cargoCoordenacao = cargoFake({ nome: 'Coordenação', ehCoordenacao: true });

    it('bloqueia quem nunca serviu na equipe nem foi Dirigente/Comando Geral', async () => {
      mockVaga(equipeAnimacao, cargoCoordenacao);
      prisma.alocacao.count.mockResolvedValue(0); // grupoA e comando geral, ambos 0
      prisma.ficha.findUnique.mockResolvedValue({ id: 'ficha-1', jaFoiEquipeDirigente: false });

      await expect(
        service.create(MONTAGEM_ID, { vagaMontagemId: VAGA_ID, tipoPessoa: 'JOVEM', fichaId: 'ficha-1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Grupo A: permite quem já serviu ACEITO naquela equipe (também confirma repetição)', async () => {
      mockVaga(equipeAnimacao, cargoCoordenacao);
      prisma.alocacao.count.mockResolvedValue(1); // R2 e Grupo A usam a mesma contagem aqui
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        confirmarRepeticao: true,
      } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('Grupo B: permite quem já foi Equipe Dirigente mesmo sem histórico na equipe', async () => {
      mockVaga(equipeAnimacao, cargoCoordenacao);
      prisma.alocacao.count.mockResolvedValue(0);
      prisma.ficha.findUnique.mockResolvedValue({ id: 'ficha-1', jaFoiEquipeDirigente: true });
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, { vagaMontagemId: VAGA_ID, tipoPessoa: 'JOVEM', fichaId: 'ficha-1' } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('Grupo B: permite quem já serviu no Comando Geral', async () => {
      mockVaga(equipeAnimacao, cargoCoordenacao);
      prisma.ficha.findUnique.mockResolvedValue({ id: 'ficha-1', jaFoiEquipeDirigente: false });
      prisma.equipe.findUnique.mockResolvedValue(equipeFake({ slug: 'comando-geral', id: 'comando-geral-id' }));
      prisma.alocacao.count.mockImplementation(async (args: any) => {
        return args.where.vagaMontagem.equipeId === 'comando-geral-id' ? 1 : 0;
      });
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, { vagaMontagemId: VAGA_ID, tipoPessoa: 'JOVEM', fichaId: 'ficha-1' } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('coordenação de CASAL numa equipe comum não exige histórico (não é Visitação)', async () => {
      mockVaga(equipeFake({ id: 'animacao-id', coordenacaoCasalExigeHistorico: false }), cargoCoordenacao);
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, { vagaMontagemId: VAGA_ID, tipoPessoa: 'CASAL', fichaCasalId: 'casal-1' } as any);

      expect(prisma.alocacao.create).toHaveBeenCalled();
      expect(prisma.ficha.findUnique).not.toHaveBeenCalled();
      expect(prisma.fichaCasal.findUnique).not.toHaveBeenCalled();
    });

    it('coordenação de CASAL na Visitação exige histórico (Grupo A/B) igual à de jovem', async () => {
      mockVaga(equipeFake({ slug: 'visitacao', coordenacaoCasalExigeHistorico: true }), cargoCoordenacao);
      prisma.alocacao.count.mockResolvedValue(0);
      prisma.fichaCasal.findUnique.mockResolvedValue({ id: 'casal-1', jaFoiEquipeDirigente: false });

      await expect(
        service.create(MONTAGEM_ID, { vagaMontagemId: VAGA_ID, tipoPessoa: 'CASAL', fichaCasalId: 'casal-1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create/update — R4 (Círculos primeiro)', () => {
    it('bloqueia CONVIDADO numa equipe comum se os Círculos não fecharam', async () => {
      mockVaga(equipeFake({ bloqueiaConvitePosCirculos: true }), cargoFake());
      prisma.equipe.findUnique.mockResolvedValue(equipeFake({ slug: 'circulos', id: 'circulos-id' }));
      prisma.alocacao.findMany.mockResolvedValue([{ status: StatusConvite.ACEITO }, { status: StatusConvite.RASCUNHO }]);

      await expect(
        service.create(MONTAGEM_ID, {
          vagaMontagemId: VAGA_ID,
          tipoPessoa: 'JOVEM',
          fichaId: 'ficha-1',
          status: StatusConvite.CONVIDADO,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('libera CONVIDADO quando todos os Círculos estão ACEITO', async () => {
      mockVaga(equipeFake({ bloqueiaConvitePosCirculos: true }), cargoFake());
      prisma.equipe.findUnique.mockResolvedValue(equipeFake({ slug: 'circulos', id: 'circulos-id' }));
      prisma.alocacao.findMany.mockResolvedValue([{ status: StatusConvite.ACEITO }, { status: StatusConvite.ACEITO }]);
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        status: StatusConvite.CONVIDADO,
      } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('não bloqueia a própria Eq. dos Círculos nem o Comando Geral', async () => {
      mockVaga(equipeFake({ slug: 'circulos', bloqueiaConvitePosCirculos: false }), cargoFake());
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        status: StatusConvite.CONVIDADO,
      } as any);
      expect(prisma.equipe.findUnique).not.toHaveBeenCalled();
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('update: bloqueia transição pra CONVIDADO se os Círculos ainda não fecharam', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        status: StatusConvite.RASCUNHO,
        substituidaPorId: null,
        vagaMontagem: {
          montagemId: MONTAGEM_ID,
          equipe: equipeFake({ bloqueiaConvitePosCirculos: true }),
          montagem: { status: 'EM_ANDAMENTO' },
        },
      });
      prisma.equipe.findUnique.mockResolvedValue(equipeFake({ slug: 'circulos', id: 'circulos-id' }));
      prisma.alocacao.findMany.mockResolvedValue([]);

      await expect(service.update(MONTAGEM_ID, 'aloc-1', { status: StatusConvite.CONVIDADO } as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alocacao.update).not.toHaveBeenCalled();
    });
  });

  describe('R9 — log de atividade e histórico de substituição', () => {
    it('registra log ao criar uma alocação', async () => {
      mockVaga(equipeFake(), cargoFake());
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        usuario: 'Lucas',
      } as any);

      expect(logAtividade.registrar).toHaveBeenCalledWith(MONTAGEM_ID, 'Lucas', 'CRIOU_ALOCACAO', expect.any(String));
    });

    it('oculta substituidaPorId quando a montagem está FINALIZADA', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        substituidaPorId: 'aloc-2',
        vagaMontagem: { montagemId: MONTAGEM_ID, equipe: equipeFake(), cargo: cargoFake(), montagem: { status: 'FINALIZADA' } },
      });

      const resultado = await service.findOne(MONTAGEM_ID, 'aloc-1');
      expect(resultado.substituidaPorId).toBeNull();
    });

    it('mantém substituidaPorId quando a montagem está EM_ANDAMENTO', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        substituidaPorId: 'aloc-2',
        vagaMontagem: { montagemId: MONTAGEM_ID, equipe: equipeFake(), cargo: cargoFake(), montagem: { status: 'EM_ANDAMENTO' } },
      });

      const resultado = await service.findOne(MONTAGEM_ID, 'aloc-1');
      expect(resultado.substituidaPorId).toBe('aloc-2');
    });
  });
});
