import { NotFoundException } from '@nestjs/common';
import { ResumoMontagemService } from './resumo-montagem.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';

// Testes unitários do log de atividade (R9), das observações do Conselho (R8) e do painel de
// resumo na ResumoMontagemService. PrismaService é totalmente mockado.

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
    observacaoMontagem: { findMany: jest.fn() },
  };
  // Passthrough: roda o callback com o próprio mock no lugar do client transacional.
  mock.$transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: unknown) => unknown)(mock)
      : Promise.all(arg as unknown[]),
  );
  return mock as Record<string, any>;
}
describe('ResumoMontagemService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let logAtividade: { registrar: jest.Mock; listar: jest.Mock };
  let service: ResumoMontagemService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    logAtividade = { registrar: jest.fn().mockResolvedValue(undefined), listar: jest.fn() };
    service = new ResumoMontagemService(
      prisma as unknown as PrismaService,
      logAtividade as unknown as LogAtividadeService,
    );
    // padrão: ninguém recusou e ninguém serviu antes (sobrescrito por teste quando precisar)
    prisma.alocacao.findMany.mockResolvedValue([]);
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

  describe('listarObservacoes (R8 — leitura pela paróquia)', () => {
    it('lista as observações da montagem da própria paróquia, mais recentes primeiro', async () => {
      prisma.montagem.findUnique.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: PAROQUIA_ID });
      const observacoes = [
        {
          id: 'obs-1',
          texto: 'Rever Eq. Cozinha',
          createdAt: new Date(),
          usuario: { nome: 'Ana' },
        },
      ];
      prisma.observacaoMontagem.findMany.mockResolvedValue(observacoes);

      const resultado = await service.listarObservacoes(MONTAGEM_ID, PAROQUIA_ID);

      expect(prisma.observacaoMontagem.findMany).toHaveBeenCalledWith({
        where: { montagemId: MONTAGEM_ID },
        select: { id: true, texto: true, createdAt: true, usuario: { select: { nome: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(resultado).toEqual(observacoes);
    });

    it('R7 — lança NotFoundException quando a montagem é de outra paróquia', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: OUTRA_PAROQUIA_ID,
      });

      await expect(service.listarObservacoes(MONTAGEM_ID, PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.observacaoMontagem.findMany).not.toHaveBeenCalled();
    });

    it('R7 — lança NotFoundException quando a montagem não existe', async () => {
      prisma.montagem.findUnique.mockResolvedValue(null);

      await expect(service.listarObservacoes(MONTAGEM_ID, PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
