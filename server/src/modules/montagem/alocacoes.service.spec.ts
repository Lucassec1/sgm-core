import { ConflictException } from '@nestjs/common';
import { Equipe, Prisma, StatusConvite } from '@prisma/client';
import { AlocacoesService } from './alocacoes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';

// Testes unitários das regras R1-R4 e R9 (log + ocultar substituição) na AlocacoesService.
// Desde 14/10/2026 R1-R4 não bloqueiam: viram avisos (409 AVISOS_REGRAS) que exigem
// confirmação consciente (`confirmarAvisos`).
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
  const mock: Record<string, unknown> = {
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
    listaSubstituicao: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  // Passthrough: roda o callback com o próprio mock no lugar do client transacional.
  mock.$transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: unknown) => unknown)(mock)
      : Promise.all(arg as unknown[]),
  );
  return mock as Record<string, any>;
}

describe('AlocacoesService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let logAtividade: { registrar: jest.Mock; listar: jest.Mock };
  let service: AlocacoesService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    logAtividade = { registrar: jest.fn().mockResolvedValue(undefined), listar: jest.fn() };
    service = new AlocacoesService(
      prisma as unknown as PrismaService,
      logAtividade as unknown as LogAtividadeService,
    );

    // padrão "sem histórico nenhum" pras regras R2/R3, sobrescrito por teste quando precisar
    prisma.alocacao.count.mockResolvedValue(0);
    prisma.alocacao.findFirst.mockResolvedValue(null);
    prisma.alocacao.findMany.mockResolvedValue([]);
    prisma.equipe.findUnique.mockResolvedValue(
      equipeFake({ slug: 'comando-geral', id: 'comando-geral-id' }),
    );
  });

  // Captura os avisos do 409 AVISOS_REGRAS (e garante que nada foi gravado).
  async function avisosDe(promessa: Promise<unknown>) {
    const erro = await promessa.then(
      () => null,
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(ConflictException);
    const corpo = (erro as ConflictException).getResponse() as {
      code: string;
      avisos: { regra: string; nivel: string; mensagem: string }[];
    };
    expect(corpo.code).toBe('AVISOS_REGRAS');
    return corpo.avisos;
  }

  function mockVaga(equipe: Equipe, cargo: Record<string, unknown>) {
    prisma.vagaMontagem.findUnique.mockResolvedValue({
      id: VAGA_ID,
      montagemId: MONTAGEM_ID,
      equipe,
      cargo,
    });
  }

  describe('create — R1–R3 não bloqueiam nem pedem confirmação (viram badge)', () => {
    it('aloca quem recusou, quem repete pela 4ª vez e quem nunca serviu na coordenação', async () => {
      prisma.alocacao.findFirst.mockResolvedValue({ id: 'antiga', status: StatusConvite.RECUSADO });
      prisma.alocacao.count.mockResolvedValue(5);
      prisma.ficha.findUnique.mockResolvedValue({ id: 'ficha-1', jaFoiEquipeDirigente: false });
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });
      mockVaga(equipeFake(), cargoFake({ nome: 'Coordenação', ehCoordenacao: true }));

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
      } as any);

      expect(prisma.alocacao.create).toHaveBeenCalled();
    });
  });

  describe('findAll — avisos de R1–R3 por alocação (badges)', () => {
    const animacao = equipeFake({ id: 'animacao-id', nome: 'Eq. da Animação' });
    const componentes = cargoFake();
    const coordenacao = cargoFake({ nome: 'Coordenação', ehCoordenacao: true });

    function alocacao(overrides: Record<string, unknown>) {
      return {
        id: 'a',
        status: StatusConvite.RASCUNHO,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        fichaCasalId: null,
        ficha: { jaFoiEquipeDirigente: false },
        fichaCasal: null,
        substituidaPorId: null,
        vagaMontagem: {
          montagemId: MONTAGEM_ID,
          equipe: animacao,
          cargo: componentes,
          montagem: { status: 'EM_ANDAMENTO' },
        },
        ...overrides,
      };
    }

    // 1ª chamada de findMany: alocações da montagem; 2ª: serviços (aceitos) em outros encontros.
    function mockAlocacoes(daMontagem: unknown[], servicosAnteriores: unknown[] = []) {
      prisma.alocacao.findMany
        .mockResolvedValueOnce(daMontagem)
        .mockResolvedValueOnce(servicosAnteriores);
    }
    const serviu = (equipeId: string, fichaId = 'ficha-1') => ({
      fichaId,
      fichaCasalId: null,
      vagaMontagem: { equipeId },
    });

    it('sem histórico nem recusa, a alocação vem sem avisos', async () => {
      mockAlocacoes([alocacao({})]);
      const [a] = await service.findAll(MONTAGEM_ID);
      expect(a.avisos).toEqual([]);
    });

    it('R1 — quem recusou e foi chamado de novo neste encontro ganha badge grave', async () => {
      mockAlocacoes([
        alocacao({ id: 'recusa', status: StatusConvite.RECUSADO }),
        alocacao({ id: 'de-novo' }),
      ]);
      const [recusa, deNovo] = await service.findAll(MONTAGEM_ID);
      expect(recusa.avisos).toEqual([]); // a própria recusa não é ativa
      expect(deNovo.avisos).toEqual([
        expect.objectContaining({ regra: 'R1', nivel: 'grave', rotulo: 'Recusou este encontro' }),
      ]);
    });

    it('R2 — 2ª/3ª vez na equipe é atenção; da 4ª em diante, grave', async () => {
      mockAlocacoes(
        [alocacao({ id: 'segunda', fichaId: 'f2' }), alocacao({ id: 'quarta', fichaId: 'f4' })],
        [serviu('animacao-id', 'f2'), ...Array(3).fill(serviu('animacao-id', 'f4'))],
      );
      const [segunda, quarta] = await service.findAll(MONTAGEM_ID);
      expect(segunda.avisos).toEqual([
        expect.objectContaining({ regra: 'R2', nivel: 'atencao', rotulo: '2ª vez nesta equipe' }),
      ]);
      expect(quarta.avisos).toEqual([
        expect.objectContaining({ regra: 'R2', nivel: 'grave', rotulo: '4ª vez nesta equipe' }),
      ]);
    });

    it('R3 — coordenação sem ter servido na equipe nem ser ED/Comando Geral ganha badge grave', async () => {
      mockAlocacoes([
        alocacao({ vagaMontagem: { ...alocacao({}).vagaMontagem, cargo: coordenacao } }),
      ]);
      const [a] = await service.findAll(MONTAGEM_ID);
      expect(a.avisos).toEqual([
        expect.objectContaining({
          regra: 'R3',
          nivel: 'grave',
          rotulo: 'Nunca serviu nesta equipe',
        }),
      ]);
    });

    it('R3 — não avisa quem já serviu na equipe, foi ED ou serviu no Comando Geral', async () => {
      const naCoordenacao = (id: string, extra: Record<string, unknown> = {}) =>
        alocacao({
          id,
          fichaId: id,
          vagaMontagem: { ...alocacao({}).vagaMontagem, cargo: coordenacao },
          ...extra,
        });
      mockAlocacoes(
        [
          naCoordenacao('serviu'),
          naCoordenacao('dirigente', { ficha: { jaFoiEquipeDirigente: true } }),
          naCoordenacao('comando'),
        ],
        [serviu('animacao-id', 'serviu'), serviu('comando-geral-id', 'comando')],
      );
      const [serviuNaEquipe, dirigente, comando] = await service.findAll(MONTAGEM_ID);
      expect(serviuNaEquipe.avisos.map((x) => x.regra)).toEqual(['R2']); // só a repetição
      expect(dirigente.avisos).toEqual([]);
      expect(comando.avisos).toEqual([]);
    });

    it('R3 — coordenação de casal só avisa nas equipes que exigem histórico (Visitação)', async () => {
      const casal = (equipe: Equipe) =>
        alocacao({
          id: equipe.id,
          tipoPessoa: 'CASAL',
          fichaId: null,
          fichaCasalId: 'casal-1',
          ficha: null,
          fichaCasal: { jaFoiEquipeDirigente: false },
          vagaMontagem: { ...alocacao({}).vagaMontagem, equipe, cargo: coordenacao },
        });
      mockAlocacoes([
        casal(animacao),
        casal(equipeFake({ id: 'visitacao-id', coordenacaoCasalExigeHistorico: true })),
      ]);
      const [comum, visitacao] = await service.findAll(MONTAGEM_ID);
      expect(comum.avisos).toEqual([]);
      expect(visitacao.avisos.map((x) => x.regra)).toEqual(['R3']);
    });
  });

  describe('create/update — R4 (Círculos primeiro)', () => {
    it('avisa ao convidar numa equipe comum se os Círculos não fecharam', async () => {
      mockVaga(equipeFake({ bloqueiaConvitePosCirculos: true }), cargoFake());
      prisma.equipe.findUnique.mockResolvedValue(
        equipeFake({ slug: 'circulos', id: 'circulos-id' }),
      );
      prisma.alocacao.findMany.mockResolvedValue([
        { status: StatusConvite.ACEITO },
        { status: StatusConvite.RASCUNHO },
      ]);

      const avisos = await avisosDe(
        service.create(MONTAGEM_ID, {
          vagaMontagemId: VAGA_ID,
          tipoPessoa: 'JOVEM',
          fichaId: 'ficha-1',
          status: StatusConvite.CONVIDADO,
        } as any),
      );
      expect(avisos).toEqual([
        {
          regra: 'R4',
          nivel: 'atencao',
          rotulo: 'Círculos em aberto',
          mensagem: 'A Eq. dos Círculos ainda não fechou (nem todos aceitaram).',
        },
      ]);

      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });
      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        status: StatusConvite.CONVIDADO,
        confirmarAvisos: true,
      } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('libera CONVIDADO quando todos os Círculos estão ACEITO', async () => {
      mockVaga(equipeFake({ bloqueiaConvitePosCirculos: true }), cargoFake());
      prisma.equipe.findUnique.mockResolvedValue(
        equipeFake({ slug: 'circulos', id: 'circulos-id' }),
      );
      prisma.alocacao.findMany.mockResolvedValue([
        { status: StatusConvite.ACEITO },
        { status: StatusConvite.ACEITO },
      ]);
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

    it('libera CONVIDADO quando a equipe Círculos nem existe (bloqueio não se aplica)', async () => {
      mockVaga(equipeFake({ bloqueiaConvitePosCirculos: true }), cargoFake());
      prisma.equipe.findUnique.mockResolvedValue(null);
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        status: StatusConvite.CONVIDADO,
      } as any);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('update: avisa na transição pra CONVIDADO se os Círculos ainda não fecharam', async () => {
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
      prisma.equipe.findUnique.mockResolvedValue(
        equipeFake({ slug: 'circulos', id: 'circulos-id' }),
      );
      prisma.alocacao.findMany.mockResolvedValue([]);

      const avisos = await avisosDe(
        service.update(MONTAGEM_ID, 'aloc-1', { status: StatusConvite.CONVIDADO } as any),
      );
      expect(avisos[0]).toMatchObject({ regra: 'R4' });
      expect(prisma.alocacao.update).not.toHaveBeenCalled();

      // Confirmado: convida, e o confirmarAvisos não vai parar no update do Prisma
      prisma.alocacao.update.mockResolvedValue({ id: 'aloc-1' });
      await service.update(MONTAGEM_ID, 'aloc-1', {
        status: StatusConvite.CONVIDADO,
        confirmarAvisos: true,
      } as any);
      expect(prisma.alocacao.update).toHaveBeenCalledWith({
        where: { id: 'aloc-1' },
        data: { status: StatusConvite.CONVIDADO },
      });
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

      expect(logAtividade.registrar).toHaveBeenCalledWith(
        MONTAGEM_ID,
        'Lucas',
        'CRIOU_ALOCACAO',
        expect.any(String),
        expect.anything(),
      );
    });

    it('converte dataConvite em Date ao criar, quando informada', async () => {
      mockVaga(equipeFake(), cargoFake());
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
        dataConvite: '2026-01-01T00:00:00.000Z',
      } as any);

      const dataArg = prisma.alocacao.create.mock.calls[0][0].data;
      expect(dataArg.dataConvite).toBeInstanceOf(Date);
    });

    it('tira a pessoa da lista de substituição desse encontro ao alocá-la', async () => {
      mockVaga(equipeFake(), cargoFake());
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
      } as any);

      expect(prisma.listaSubstituicao.deleteMany).toHaveBeenCalledWith({
        where: { montagemId: MONTAGEM_ID, fichaId: 'ficha-1' },
      });
    });

    it('oculta substituidaPorId quando a montagem está FINALIZADA', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        substituidaPorId: 'aloc-2',
        vagaMontagem: {
          montagemId: MONTAGEM_ID,
          equipe: equipeFake(),
          cargo: cargoFake(),
          montagem: { status: 'FINALIZADA' },
        },
      });

      const resultado = await service.findOne(MONTAGEM_ID, 'aloc-1');
      expect(resultado.substituidaPorId).toBeNull();
    });

    it('mantém substituidaPorId quando a montagem está EM_ANDAMENTO', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        substituidaPorId: 'aloc-2',
        vagaMontagem: {
          montagemId: MONTAGEM_ID,
          equipe: equipeFake(),
          cargo: cargoFake(),
          montagem: { status: 'EM_ANDAMENTO' },
        },
      });

      const resultado = await service.findOne(MONTAGEM_ID, 'aloc-1');
      expect(resultado.substituidaPorId).toBe('aloc-2');
    });
  });

  describe('create — retry em conflito de serialização (Postgres P2034)', () => {
    it('repete a transação até 3x quando o Postgres aborta por serialização (P2034)', async () => {
      mockVaga(equipeFake(), cargoFake());
      const erroSerializacao = new Prisma.PrismaClientKnownRequestError('conflito', {
        code: 'P2034',
        clientVersion: '7.9.1',
      });
      let tentativa = 0;
      prisma.$transaction.mockImplementation(async (arg: unknown) => {
        tentativa++;
        if (tentativa < 3) throw erroSerializacao;
        return (arg as (tx: unknown) => unknown)(prisma);
      });
      prisma.alocacao.create.mockResolvedValue({ id: 'nova' });

      await service.create(MONTAGEM_ID, {
        vagaMontagemId: VAGA_ID,
        tipoPessoa: 'JOVEM',
        fichaId: 'ficha-1',
      } as any);

      expect(tentativa).toBe(3);
      expect(prisma.alocacao.create).toHaveBeenCalled();
    });

    it('desiste após esgotar as tentativas e repropaga o erro de serialização', async () => {
      mockVaga(equipeFake(), cargoFake());
      const erroSerializacao = new Prisma.PrismaClientKnownRequestError('conflito', {
        code: 'P2034',
        clientVersion: '7.9.1',
      });
      prisma.$transaction.mockRejectedValue(erroSerializacao);

      await expect(
        service.create(MONTAGEM_ID, {
          vagaMontagemId: VAGA_ID,
          tipoPessoa: 'JOVEM',
          fichaId: 'ficha-1',
        } as any),
      ).rejects.toThrow(erroSerializacao);
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it('não repete quando o erro não é de serialização (P2034)', async () => {
      mockVaga(equipeFake(), cargoFake());
      prisma.$transaction.mockRejectedValue(new Error('erro qualquer'));

      await expect(
        service.create(MONTAGEM_ID, {
          vagaMontagemId: VAGA_ID,
          tipoPessoa: 'JOVEM',
          fichaId: 'ficha-1',
        } as any),
      ).rejects.toThrow('erro qualquer');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('create — vaga inválida', () => {
    it('rejeita quando a vaga não existe', async () => {
      prisma.vagaMontagem.findUnique.mockResolvedValue(null);

      await expect(
        service.create(MONTAGEM_ID, {
          vagaMontagemId: VAGA_ID,
          tipoPessoa: 'JOVEM',
          fichaId: 'ficha-1',
        } as any),
      ).rejects.toThrow('não pertence à montagem');
    });

    it('rejeita quando a vaga pertence a outra montagem', async () => {
      prisma.vagaMontagem.findUnique.mockResolvedValue({
        id: VAGA_ID,
        montagemId: 'outra-montagem',
        equipe: equipeFake(),
        cargo: cargoFake(),
      });

      await expect(
        service.create(MONTAGEM_ID, {
          vagaMontagemId: VAGA_ID,
          tipoPessoa: 'JOVEM',
          fichaId: 'ficha-1',
        } as any),
      ).rejects.toThrow('não pertence à montagem');
    });
  });

  describe('findAll', () => {
    it('lista as alocações da montagem, ocultando substituição de montagem finalizada', async () => {
      prisma.alocacao.findMany.mockResolvedValue([
        {
          id: 'aloc-1',
          substituidaPorId: 'aloc-2',
          vagaMontagem: { montagem: { status: 'FINALIZADA' } },
        },
        {
          id: 'aloc-2',
          substituidaPorId: 'aloc-3',
          vagaMontagem: { montagem: { status: 'EM_ANDAMENTO' } },
        },
      ]);

      const resultado = await service.findAll(MONTAGEM_ID);

      expect(prisma.alocacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { vagaMontagem: { montagemId: MONTAGEM_ID } } }),
      );
      expect(resultado[0].substituidaPorId).toBeNull();
      expect(resultado[1].substituidaPorId).toBe('aloc-3');
    });
  });

  describe('findOne — não encontrada', () => {
    it('lança NotFoundException quando a alocação não existe', async () => {
      prisma.alocacao.findUnique.mockResolvedValue(null);
      await expect(service.findOne(MONTAGEM_ID, 'inexistente')).rejects.toThrow(
        'não encontrada na montagem',
      );
    });

    it('lança NotFoundException quando a alocação é de outra montagem', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        vagaMontagem: { montagemId: 'outra-montagem' },
      });
      await expect(service.findOne(MONTAGEM_ID, 'aloc-1')).rejects.toThrow(
        'não encontrada na montagem',
      );
    });
  });

  describe('update — caminho feliz', () => {
    it('atualiza a alocação (sem mexer em status) e registra o log', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        status: StatusConvite.CONVIDADO,
        substituidaPorId: null,
        vagaMontagem: {
          montagemId: MONTAGEM_ID,
          equipe: equipeFake(),
          cargo: cargoFake(),
          montagem: { status: 'EM_ANDAMENTO' },
        },
      });
      prisma.alocacao.update.mockResolvedValue({ id: 'aloc-1', status: StatusConvite.ACEITO });

      const resultado = await service.update(MONTAGEM_ID, 'aloc-1', {
        status: StatusConvite.ACEITO,
        usuario: 'Ana',
      } as any);

      expect(prisma.alocacao.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'aloc-1' } }),
      );
      expect(logAtividade.registrar).toHaveBeenCalledWith(
        MONTAGEM_ID,
        'Ana',
        'ATUALIZOU_ALOCACAO',
        `status -> ${StatusConvite.ACEITO}`,
        expect.anything(),
      );
      expect(resultado).toEqual({ id: 'aloc-1', status: StatusConvite.ACEITO });
    });

    it('converte dataConvite/dataResposta em Date quando informadas', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        status: StatusConvite.RASCUNHO,
        substituidaPorId: null,
        vagaMontagem: {
          montagemId: MONTAGEM_ID,
          equipe: equipeFake(),
          cargo: cargoFake(),
          montagem: { status: 'EM_ANDAMENTO' },
        },
      });
      prisma.alocacao.update.mockResolvedValue({ id: 'aloc-1' });

      await service.update(MONTAGEM_ID, 'aloc-1', {
        dataConvite: '2026-01-01T00:00:00.000Z',
        dataResposta: '2026-01-02T00:00:00.000Z',
      } as any);

      const dataArg = prisma.alocacao.update.mock.calls[0][0].data;
      expect(dataArg.dataConvite).toBeInstanceOf(Date);
      expect(dataArg.dataResposta).toBeInstanceOf(Date);
    });
  });

  describe('remove', () => {
    it('remove a alocação e registra o log', async () => {
      prisma.alocacao.findUnique.mockResolvedValue({
        id: 'aloc-1',
        substituidaPorId: null,
        vagaMontagem: {
          montagemId: MONTAGEM_ID,
          equipe: equipeFake({ nome: 'Eq. da Animação' }),
          cargo: cargoFake({ nome: 'Componentes' }),
          montagem: { status: 'EM_ANDAMENTO' },
        },
      });

      const resultado = await service.remove(MONTAGEM_ID, 'aloc-1');

      expect(prisma.alocacao.delete).toHaveBeenCalledWith({ where: { id: 'aloc-1' } });
      expect(logAtividade.registrar).toHaveBeenCalledWith(
        MONTAGEM_ID,
        undefined,
        'REMOVEU_ALOCACAO',
        'Eq. da Animação / Componentes',
        expect.anything(),
      );
      expect(resultado.id).toBe('aloc-1');
    });
  });
});
