import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusConvite } from '@prisma/client';
import { SugestoesMontagemService } from './sugestoes-montagem.service';
import { PrismaService } from '../../prisma/prisma.service';

// Testes unitários das regras R3 (filtro de fichas ativas na sugestão de coordenadores) e R5
// (prioridade de convite, com as badges de R1/R2) na SugestoesMontagemService. PrismaService é
// totalmente mockado.

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
describe('SugestoesMontagemService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let service: SugestoesMontagemService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new SugestoesMontagemService(prisma as unknown as PrismaService);
    // padrão: ninguém recusou e ninguém serviu antes (sobrescrito por teste quando precisar)
    prisma.alocacao.findMany.mockResolvedValue([]);
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

    it('R1 avisa, não bloqueia: quem recusou/desistiu vem no fim, marcado', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        numeroEncontro: 7,
        vagas: [],
      });
      prisma.alocacao.findMany.mockResolvedValue([{ fichaId: 'f-recusou' }]);
      prisma.ficha.findMany.mockResolvedValue([
        { id: 'f-recusou', numeroEncontro: 6 },
        { id: 'f-ok', numeroEncontro: 5 },
      ]);

      const candidatos = await service.candidatosJovens(MONTAGEM_ID, PAROQUIA_ID);

      expect(candidatos.map((f) => [f.id, f.recusouNesteEncontro])).toEqual([
        ['f-ok', false],
        ['f-recusou', true],
      ]);
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

  describe('candidatos — badges de R1/R2 na busca', () => {
    const montagemComVaga = {
      id: MONTAGEM_ID,
      paroquiaId: PAROQUIA_ID,
      numeroEncontro: 7,
      vagas: [{ id: 'vaga-1', equipeId: 'equipe-1', quantidadeRapazes: 1, quantidadeMocas: 1 }],
    };

    it('jovens: com a vaga informada, conta quantas vezes cada um já serviu na equipe dela', async () => {
      prisma.montagem.findUnique.mockResolvedValue(montagemComVaga);
      prisma.alocacao.findMany.mockImplementation(async (args: any) =>
        args.where.status === StatusConvite.ACEITO
          ? [{ fichaId: 'f-veterano' }, { fichaId: 'f-veterano' }, { fichaId: 'f-veterano' }]
          : [],
      );
      prisma.ficha.findMany.mockResolvedValue([
        { id: 'f-veterano', numeroEncontro: 6 },
        { id: 'f-novo', numeroEncontro: 6 },
      ]);

      const candidatos = await service.candidatosJovens(MONTAGEM_ID, PAROQUIA_ID, 'vaga-1');

      expect(candidatos.map((c) => [c.id, c.vezesNaEquipe])).toEqual([
        ['f-veterano', 3],
        ['f-novo', 0],
      ]);
      // conta só serviço aceito nessa equipe, fora desta montagem
      expect(prisma.alocacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: StatusConvite.ACEITO,
            vagaMontagem: { equipeId: 'equipe-1', montagemId: { not: MONTAGEM_ID } },
          }),
        }),
      );
    });

    it('casais: só da paróquia, ativos, com recusa e vezes na equipe; recusados no fim', async () => {
      prisma.montagem.findUnique.mockResolvedValue(montagemComVaga);
      prisma.alocacao.findMany.mockImplementation(async (args: any) =>
        args.where.status === StatusConvite.ACEITO
          ? [{ fichaCasalId: 'c-visitacao' }]
          : [{ fichaCasalId: 'c-recusou' }],
      );
      prisma.fichaCasal.findMany.mockResolvedValue([
        { id: 'c-recusou', nomeEle: 'A' },
        { id: 'c-visitacao', nomeEle: 'B' },
      ]);

      const casais = await service.candidatosCasais(MONTAGEM_ID, PAROQUIA_ID, 'vaga-1');

      expect(prisma.fichaCasal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paroquiaId: PAROQUIA_ID, situacao: 'ATIVA' } }),
      );
      expect(casais.map((c) => [c.id, c.recusouNesteEncontro, c.vezesNaEquipe])).toEqual([
        ['c-visitacao', false, 1],
        ['c-recusou', true, 0],
      ]);
    });

    it('casais: R7 — montagem de outra paróquia dá NotFound', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        ...montagemComVaga,
        paroquiaId: OUTRA_PAROQUIA_ID,
      });
      await expect(service.candidatosCasais(MONTAGEM_ID, PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
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

    // Banco fake: fichas da paróquia, cada uma com as equipes em que serviu (aceito) e onde foi
    // avaliada como "pode coordenar". O findMany responde conforme o `where` da Service.
    function mockFichas(
      fichas: {
        id: string;
        jaFoiEquipeDirigente?: boolean;
        serviuEm?: string[];
        avaliadaEm?: string[];
      }[],
    ) {
      prisma.ficha.findMany.mockImplementation(async (args: any) => {
        const equipeDoFiltro = args.where.alocacoes?.some?.vagaMontagem?.equipeId;
        const lista = equipeDoFiltro
          ? fichas.filter((f) => f.serviuEm?.includes(equipeDoFiltro))
          : fichas;
        return lista.map((f) =>
          args.select
            ? { id: f.id }
            : {
                id: f.id,
                nomeCompleto: f.id,
                jaFoiEquipeDirigente: !!f.jaFoiEquipeDirigente,
                alocacoes: (f.avaliadaEm ?? []).includes('equipe-1') ? [{ id: 'aval' }] : [],
              },
        );
      });
      prisma.fichaCasal.findMany.mockResolvedValue([]);
    }

    beforeEach(() => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });
      prisma.equipe.findUnique.mockImplementation(async (args: any) =>
        args.where.slug === 'comando-geral'
          ? { id: 'equipe-comando-geral', slug: 'comando-geral' }
          : { id: 'equipe-1', slug: 'animacao' },
      );
    });

    it('R7 — toda busca de ficha/casal filtra pela paróquia da montagem', async () => {
      mockFichas([]);

      await service.coordenadoresSugeridos(MONTAGEM_ID, 'equipe-1', PAROQUIA_ID);

      expect(prisma.ficha.findMany).toHaveBeenCalled();
      for (const [args] of [
        ...prisma.ficha.findMany.mock.calls,
        ...prisma.fichaCasal.findMany.mock.calls,
      ]) {
        expect(args.where.paroquiaId).toBe(PAROQUIA_ID);
      }
    });

    it('informa quantas vezes cada pessoa já serviu na equipe (badge de R2)', async () => {
      mockFichas([{ id: 'serviu', serviuEm: ['equipe-1'] }, { id: 'nunca' }]);
      prisma.alocacao.findMany.mockImplementation(async (args: any) =>
        args.select?.fichaId ? [{ fichaId: 'serviu' }, { fichaId: 'serviu' }] : [],
      );

      const r = await service.coordenadoresSugeridos(MONTAGEM_ID, 'equipe-1', PAROQUIA_ID);

      expect(r.grupoA.fichas[0]).toMatchObject({ id: 'serviu', vezesNaEquipe: 2 });
      expect(r.outros.fichas[0]).toMatchObject({ id: 'nunca', vezesNaEquipe: 0 });
    });

    it('separa Grupo A, Grupo B e outros — e avaliados "pode coordenar" vêm primeiro no A', async () => {
      mockFichas([
        { id: 'serviu', serviuEm: ['equipe-1'] },
        { id: 'serviu-e-avaliada', serviuEm: ['equipe-1'], avaliadaEm: ['equipe-1'] },
        { id: 'dirigente', jaFoiEquipeDirigente: true },
        { id: 'comando-geral', serviuEm: ['equipe-comando-geral'] },
        { id: 'dirigente-e-serviu', jaFoiEquipeDirigente: true, serviuEm: ['equipe-1'] },
        { id: 'nunca-serviu' },
      ]);

      const r = await service.coordenadoresSugeridos(MONTAGEM_ID, 'equipe-1', PAROQUIA_ID);

      expect(r.grupoA.fichas.map((f) => [f.id, f.avaliadoPodeCoordenar])).toEqual([
        ['serviu-e-avaliada', true],
        ['serviu', false],
        ['dirigente-e-serviu', false],
      ]);
      expect(r.grupoB.fichas.map((f) => f.id)).toEqual(['dirigente', 'comando-geral']);
      expect(r.outros.fichas.map((f) => f.id)).toEqual(['nunca-serviu']);
    });
  });
});
