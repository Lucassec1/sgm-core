import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MontagensService } from './montagens.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import * as path from 'path';

// Cargos reais do seed (fora do rootDir — require dinâmico só no teste), no formato que o
// service lê de prisma.cargo.findMany({ include: { equipe: true } }).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EQUIPES } = require(path.join(__dirname, '../../../prisma/seed-equipes')) as {
  EQUIPES: { slug: string; cargos: Record<string, any>[] }[];
};
const CARGOS_SEED = EQUIPES.flatMap((e) =>
  e.cargos.map((c) => ({
    quantidadeCasais: 0,
    quantidadeRapazes: 0,
    quantidadeMocas: 0,
    quantidadeDinamica: false,
    ...c,
    id: `${e.slug}:${c.nome}`,
    equipeId: e.slug,
    equipe: { slug: e.slug },
  })),
);

// Testes unitários das regras R6 (validação de tamanho do encontro) e R7 (isolamento por
// paróquia) na MontagensService. PrismaService é totalmente mockado.

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
    implantacao: { findFirst: jest.fn().mockResolvedValue(null) },
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
    // padrão: ninguém recusou e ninguém serviu antes (sobrescrito por teste quando precisar)
    prisma.alocacao.findMany.mockResolvedValue([]);
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
          recebeSementeira: true,
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
            recebeSementeira: true,
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
            recebeSementeira: true,
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
          recebeSementeira: true,
        } as any,
        PAROQUIA_ID,
      );

      const { data } = prisma.vagaMontagem.createMany.mock.calls[0][0];
      expect(data.find((v: any) => v.cargoId === 'cargo-visitacao').quantidadeCasais).toBe(24);
    });
  });

  describe('create — encontros de implantação (Anexos I–III)', () => {
    const vinculo = {
      id: 'i1',
      madrinhaId: 'madrinha',
      afilhadaId: 'afilhada',
      fase: 'IMPLANTACAO',
    };

    beforeEach(() => {
      prisma.cargo.findMany.mockResolvedValue(CARGOS_SEED);
      prisma.montagem.create.mockResolvedValue({ id: MONTAGEM_ID, paroquiaId: 'afilhada' });
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: 'afilhada',
        vagas: [],
      });
    });

    it('afilhada em IMPLANTACAO criando o encontro 1: vagas do Anexo I, por origem', async () => {
      prisma.implantacao.findFirst.mockResolvedValue(vinculo);
      prisma.montagem.findFirst.mockResolvedValue(null);

      await service.create({ data: '2027-01-10', numeroJovensVivenciando: 60 } as any, 'afilhada');

      expect(prisma.implantacao.findFirst).toHaveBeenCalledWith({
        where: { afilhadaId: 'afilhada', fase: 'IMPLANTACAO' },
      });
      expect(prisma.montagem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            implantacaoId: 'i1',
            anexoImplantacao: 1,
            numeroEncontro: 1,
          }),
        }),
      );
      const { data } = prisma.vagaMontagem.createMany.mock.calls[0][0];
      const pessoas = data.reduce(
        (s: number, v: any) =>
          s + v.quantidadeCasais * 2 + v.quantidadeRapazes + v.quantidadeMocas + v.quantidadeJovens,
        0,
      );
      expect(pessoas).toBe(232);
      const visitacao = data.filter((v: any) => v.equipeId === 'visitacao');
      expect(visitacao.map((v: any) => [v.cargoId, v.origem, v.quantidadeCasais])).toEqual([
        ['visitacao:Coordenação', 'MADRINHA', 1],
        ['visitacao:Componentes', 'AFILHADA', 20],
      ]);
    });

    it('afilhada criando o encontro 4: vagas normais, sem anexo', async () => {
      prisma.implantacao.findFirst.mockResolvedValue(vinculo);
      prisma.montagem.findFirst.mockResolvedValue({ numeroEncontro: 3 });

      await service.create({ data: '2030-01-10', numeroJovensVivenciando: 45 } as any, 'afilhada');

      const { data: montagem } = prisma.montagem.create.mock.calls[0][0];
      expect(montagem.anexoImplantacao).toBeUndefined();
      const { data } = prisma.vagaMontagem.createMany.mock.calls[0][0];
      expect(data).toHaveLength(CARGOS_SEED.length);
      expect(data.every((v: any) => v.origem === undefined)).toBe(true);
    });

    it('encontro de anexo não pode receber sementeira → 400', async () => {
      prisma.implantacao.findFirst.mockResolvedValue(vinculo);
      prisma.montagem.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { data: '2027-01-10', numeroJovensVivenciando: 60, recebeSementeira: true } as any,
          'afilhada',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.montagem.create).not.toHaveBeenCalled();
    });
  });

  describe('create — sementeira com quantidade', () => {
    beforeEach(() => {
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
    });

    it('com 10 de sementeira aceita até 70 e calcula a Visitação pelos locais', async () => {
      await service.create(
        {
          data: '2026-09-10',
          numeroJovensVivenciando: 70,
          recebeSementeira: true,
          quantidadeJovensSementeira: 10,
        } as any,
        PAROQUIA_ID,
      );
      const { data } = prisma.vagaMontagem.createMany.mock.calls[0][0];
      expect(data[0].quantidadeCasais).toBe(24); // ceil(60/3) + 4
      expect(prisma.montagem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantidadeJovensSementeira: 10,
            quantidadeCasaisAfilhada: 4,
          }),
        }),
      );
    });

    it('com 10 de sementeira recusa 71', async () => {
      await expect(
        service.create(
          {
            data: '2026-09-10',
            numeroJovensVivenciando: 71,
            recebeSementeira: true,
            quantidadeJovensSementeira: 10,
          } as any,
          PAROQUIA_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('mais de 12 de sementeira → 400', async () => {
      await expect(
        service.create(
          {
            data: '2026-09-10',
            numeroJovensVivenciando: 60,
            recebeSementeira: true,
            quantidadeJovensSementeira: 13,
          } as any,
          PAROQUIA_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('sementeira de um vínculo em que a paróquia não é madrinha → 404', async () => {
      prisma.implantacao.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          {
            data: '2026-09-10',
            numeroJovensVivenciando: 60,
            recebeSementeira: true,
            sementeiraDeImplantacaoId: 'i-outra',
          } as any,
          PAROQUIA_ID,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.implantacao.findFirst).toHaveBeenCalledWith({
        where: { id: 'i-outra', madrinhaId: PAROQUIA_ID, fase: 'SEMENTEIRA' },
      });
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

  describe('update — recalcula a Visitação quando numeroJovensVivenciando/recebeSementeira mudam', () => {
    it('recalcula a vaga dinâmica quando numeroJovensVivenciando muda', async () => {
      const vagaDinamica = { id: 'vaga-visitacao', cargo: { quantidadeDinamica: true } };
      prisma.montagem.findUnique
        .mockResolvedValueOnce({
          id: MONTAGEM_ID,
          paroquiaId: PAROQUIA_ID,
          status: 'EM_ANDAMENTO',
          numeroJovensVivenciando: 40,
          recebeSementeira: false,
          vagas: [],
        })
        .mockResolvedValueOnce({
          id: MONTAGEM_ID,
          paroquiaId: PAROQUIA_ID,
          status: 'EM_ANDAMENTO',
          numeroJovensVivenciando: 57,
          recebeSementeira: false,
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
        recebeSementeira: true,
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
        recebeSementeira: false,
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
        recebeSementeira: false,
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

    it('grava quantidadeJovensSementeira/quantidadeCasaisAfilhada quando recebeSementeira muda pra true', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        status: 'EM_ANDAMENTO',
        numeroJovensVivenciando: 52,
        recebeSementeira: false,
        vagas: [],
      });
      prisma.montagem.update.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [],
      });

      await service.update(MONTAGEM_ID, { recebeSementeira: true } as any, PAROQUIA_ID);

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

  describe('update — encontro de implantação', () => {
    it('mudar o nº de jovens não recalcula as vagas do anexo', async () => {
      prisma.montagem.findUnique.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        status: 'EM_ANDAMENTO',
        numeroJovensVivenciando: 50,
        recebeSementeira: false,
        anexoImplantacao: 1,
        vagas: [{ id: 'vaga-visitacao', cargo: { quantidadeDinamica: true } }],
      });
      prisma.montagem.update.mockResolvedValue({
        id: MONTAGEM_ID,
        paroquiaId: PAROQUIA_ID,
        vagas: [{ id: 'vaga-visitacao', cargo: { quantidadeDinamica: true } }],
      });

      await service.update(MONTAGEM_ID, { numeroJovensVivenciando: 57 } as any, PAROQUIA_ID);

      expect(prisma.vagaMontagem.update).not.toHaveBeenCalled();
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
        recebeSementeira: false,
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
});
