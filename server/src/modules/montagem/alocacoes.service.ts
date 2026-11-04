import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Equipe, Prisma, StatusConvite } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import { CreateAlocacaoDto } from './dto/create-alocacao.dto';
import { UpdateAlocacaoDto } from './dto/update-alocacao.dto';
import { garantirPessoaDaParoquia } from './pessoa-da-paroquia';

const ALOCACAO_INCLUDE = {
  vagaMontagem: { include: { equipe: true, cargo: true, montagem: { select: { status: true } } } },
  ficha: true,
  fichaCasal: true,
};

export interface AvisoRegra {
  regra: 'R1' | 'R2' | 'R3' | 'R4';
  // `grave` = foge da regra (ex.: 4ª vez na equipe, nunca serviu e vai coordenar);
  // `atencao` = vale conferir (ex.: 2ª vez na equipe).
  nivel: 'grave' | 'atencao';
  // Texto curto pra badge ("4ª vez nesta equipe"); `mensagem` é a explicação completa.
  rotulo: string;
  mensagem: string;
}

const STATUS_ATIVOS: StatusConvite[] = [
  StatusConvite.RASCUNHO,
  StatusConvite.CONVIDADO,
  StatusConvite.ACEITO,
];

// Regras de negócio do Segue-me (docs/regras-imutaveis.md) aplicadas na atribuição de pessoas
// às vagas da Montagem. R7 (isolamento por paróquia) e R8 (Conselho) ficam de fora — ver
// plano da etapa "Módulo Montagem — regras R1-R9".
@Injectable()
export class AlocacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logAtividade: LogAtividadeService,
  ) {}

  // Sob isolamento Serializable o Postgres aborta uma das transações concorrentes com
  // P2034 — a operação é segura de repetir. O volume de uso (equipe dirigente, não
  // público) torna poucas tentativas suficientes.
  private async comRetrySerializacao<T>(fn: () => Promise<T>, tentativas = 3): Promise<T> {
    for (let i = 1; ; i++) {
      try {
        return await fn();
      } catch (err) {
        const conflito =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
        if (!conflito || i >= tentativas) throw err;
      }
    }
  }

  private async getVagaOuFalha(
    tx: Prisma.TransactionClient,
    montagemId: string,
    vagaMontagemId: string,
  ) {
    const vaga = await tx.vagaMontagem.findUnique({
      where: { id: vagaMontagemId },
      include: { equipe: true, cargo: true },
    });
    if (!vaga || vaga.montagemId !== montagemId) {
      throw new BadRequestException(`Vaga ${vagaMontagemId} não pertence à montagem ${montagemId}`);
    }
    return vaga;
  }

  // Avisos de R1–R3 de cada alocação ativa da montagem, calculados em lote (poucas queries pra
  // montagem inteira) — viram badges no client (decisão de 14/10/2026: R1–R3 não bloqueiam nem
  // pedem confirmação, só ficam visíveis). Serviço feito em montagens finalizadas ou em
  // andamento de outros encontros conta (status ACEITO).
  private async avisosDasAlocacoes(
    montagemId: string,
    alocacoes: {
      id: string;
      status: StatusConvite;
      tipoPessoa: string;
      fichaId: string | null;
      fichaCasalId: string | null;
      ficha: { jaFoiEquipeDirigente: boolean } | null;
      fichaCasal: { jaFoiEquipeDirigente: boolean } | null;
      vagaMontagem: { equipe: Equipe; cargo: { ehCoordenacao: boolean } };
    }[],
  ): Promise<Map<string, AvisoRegra[]>> {
    const chave = (a: { fichaId: string | null; fichaCasalId: string | null }) =>
      a.fichaId ? `f:${a.fichaId}` : `c:${a.fichaCasalId}`;
    const fichaIds = [
      ...new Set(alocacoes.map((a) => a.fichaId).filter((id): id is string => !!id)),
    ];
    const casalIds = [
      ...new Set(alocacoes.map((a) => a.fichaCasalId).filter((id): id is string => !!id)),
    ];

    const [servicosAnteriores, comandoGeral] = await Promise.all([
      this.prisma.alocacao.findMany({
        where: {
          status: StatusConvite.ACEITO,
          vagaMontagem: { montagemId: { not: montagemId } },
          OR: [{ fichaId: { in: fichaIds } }, { fichaCasalId: { in: casalIds } }],
        },
        select: { fichaId: true, fichaCasalId: true, vagaMontagem: { select: { equipeId: true } } },
      }),
      this.prisma.equipe.findUnique({ where: { slug: 'comando-geral' } }),
    ]);
    // pessoa -> equipe -> vezes servidas (aceito) em outros encontros
    const vezes = new Map<string, Map<string, number>>();
    for (const s of servicosAnteriores) {
      const porEquipe = vezes.get(chave(s)) ?? new Map<string, number>();
      porEquipe.set(s.vagaMontagem.equipeId, (porEquipe.get(s.vagaMontagem.equipeId) ?? 0) + 1);
      vezes.set(chave(s), porEquipe);
    }
    const saiuDesteEncontro = new Set(
      alocacoes
        .filter((a) => a.status === StatusConvite.RECUSADO || a.status === StatusConvite.DESISTIU)
        .map(chave),
    );

    const resultado = new Map<string, AvisoRegra[]>();
    for (const a of alocacoes) {
      if (!STATUS_ATIVOS.includes(a.status)) continue;
      const avisos: AvisoRegra[] = [];
      const { equipe, cargo } = a.vagaMontagem;
      const porEquipe = vezes.get(chave(a));
      const naEquipe = porEquipe?.get(equipe.id) ?? 0;

      if (saiuDesteEncontro.has(chave(a))) {
        avisos.push({
          regra: 'R1',
          nivel: 'grave',
          rotulo: 'Recusou este encontro',
          mensagem: 'Recusou ou desistiu do convite deste encontro e foi chamada de novo.',
        });
      }
      if (naEquipe > 0) {
        avisos.push({
          regra: 'R2',
          nivel: naEquipe >= 3 ? 'grave' : 'atencao',
          rotulo: `${naEquipe + 1}ª vez nesta equipe`,
          mensagem: `Já serviu ${naEquipe}x em ${equipe.nome} — esta é a ${naEquipe + 1}ª vez.`,
        });
      }
      const exigeHistorico =
        cargo.ehCoordenacao && (a.tipoPessoa === 'JOVEM' || equipe.coordenacaoCasalExigeHistorico);
      const grupoB =
        !!(a.ficha ?? a.fichaCasal)?.jaFoiEquipeDirigente ||
        (!!comandoGeral && (porEquipe?.get(comandoGeral.id) ?? 0) > 0);
      if (exigeHistorico && naEquipe === 0 && !grupoB) {
        avisos.push({
          regra: 'R3',
          nivel: 'grave',
          rotulo: 'Nunca serviu nesta equipe',
          mensagem: `Coordena ${equipe.nome} sem ter servido nela como equipista nem ter sido Equipe Dirigente/Comando Geral.`,
        });
      }
      if (avisos.length) resultado.set(a.id, avisos);
    }
    return resultado;
  }

  // R4 — Eq. dos Círculos primeiro: convidar as demais equipes (exceto Círculos e Comando
  // Geral) antes de todos os membros dos Círculos aceitarem.
  private async avisoConviteAntesDosCirculos(
    tx: Prisma.TransactionClient,
    equipe: Equipe,
    montagemId: string,
  ): Promise<AvisoRegra | null> {
    if (!equipe.bloqueiaConvitePosCirculos) return null;

    const circulos = await tx.equipe.findUnique({ where: { slug: 'circulos' } });
    if (!circulos) return null;

    const alocacoesCirculos = await tx.alocacao.findMany({
      where: { vagaMontagem: { equipeId: circulos.id, montagemId } },
      select: { status: true },
    });

    const fechado =
      alocacoesCirculos.length > 0 &&
      alocacoesCirculos.every((a) => a.status === StatusConvite.ACEITO);
    if (fechado) return null;
    return {
      regra: 'R4',
      nivel: 'atencao',
      rotulo: 'Círculos em aberto',
      mensagem: 'A Eq. dos Círculos ainda não fechou (nem todos aceitaram).',
    };
  }

  // R4 é o único aviso que pede confirmação (convidar dispara convite pra várias pessoas de uma
  // vez — decisão de 14/10/2026, docs/regras-imutaveis.md): sem confirmação, 409 com a lista; o
  // client mostra e reenvia com confirmarAvisos. R1–R3 só viram badge (avisosDasAlocacoes).
  private exigirConfirmacao(avisos: (AvisoRegra | null)[], confirmado: boolean | undefined) {
    const pendentes = avisos.filter((a): a is AvisoRegra => !!a);
    if (pendentes.length === 0 || confirmado) return;
    throw new ConflictException({
      code: 'AVISOS_REGRAS',
      message: pendentes.map((a) => a.mensagem).join(' '),
      avisos: pendentes,
    });
  }

  private ocultarSubstituicaoSeFinalizada<
    T extends { substituidaPorId: string | null; vagaMontagem: { montagem: { status: string } } },
  >(alocacao: T): T {
    if (alocacao.vagaMontagem.montagem.status === 'FINALIZADA') {
      return { ...alocacao, substituidaPorId: null };
    }
    return alocacao;
  }

  async create(montagemId: string, dto: CreateAlocacaoDto) {
    // Aviso de R4 + escrita (+ saída da lista de substituição + log R9) numa única transação
    // Serializable, pra ler o estado dos Círculos e gravar enxergando a mesma foto.
    return this.comRetrySerializacao(() =>
      this.prisma.$transaction(
        async (tx) => {
          const vaga = await this.getVagaOuFalha(tx, montagemId, dto.vagaMontagemId);
          await garantirPessoaDaParoquia(tx, montagemId, dto);

          if (dto.status === StatusConvite.CONVIDADO) {
            this.exigirConfirmacao(
              [await this.avisoConviteAntesDosCirculos(tx, vaga.equipe, montagemId)],
              dto.confirmarAvisos || dto.confirmarRepeticao,
            );
          }

          const alocacao = await tx.alocacao.create({
            data: {
              vagaMontagemId: dto.vagaMontagemId,
              tipoPessoa: dto.tipoPessoa,
              fichaId: dto.fichaId,
              fichaCasalId: dto.fichaCasalId,
              status: dto.status,
              dataConvite: dto.dataConvite ? new Date(dto.dataConvite) : undefined,
              motivoRecusa: dto.motivoRecusa,
            },
          });

          // Se a pessoa estava no banco de substituição desse encontro, sai da lista ao ser
          // alocada — a lista é só "prontos pra entrar", quem entrou não fica mais lá
          // (ver docs/ux-e-fluxos.md, seção 3).
          await tx.listaSubstituicao.deleteMany({
            where: {
              montagemId,
              ...(dto.fichaId ? { fichaId: dto.fichaId } : { fichaCasalId: dto.fichaCasalId }),
            },
          });

          await this.logAtividade.registrar(
            montagemId,
            dto.usuario,
            'CRIOU_ALOCACAO',
            `${vaga.equipe.nome} / ${vaga.cargo.nome}`,
            tx,
          );

          return alocacao;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async findAll(montagemId: string) {
    const alocacoes = await this.prisma.alocacao.findMany({
      where: { vagaMontagem: { montagemId } },
      include: ALOCACAO_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    const avisos = await this.avisosDasAlocacoes(montagemId, alocacoes);
    return alocacoes.map((a) => ({
      ...this.ocultarSubstituicaoSeFinalizada(a),
      avisos: avisos.get(a.id) ?? [],
    }));
  }

  async findOne(montagemId: string, id: string) {
    const alocacao = await this.prisma.alocacao.findUnique({
      where: { id },
      include: ALOCACAO_INCLUDE,
    });
    if (!alocacao || alocacao.vagaMontagem.montagemId !== montagemId) {
      throw new NotFoundException(`Alocação ${id} não encontrada na montagem ${montagemId}`);
    }
    return this.ocultarSubstituicaoSeFinalizada(alocacao);
  }

  async update(montagemId: string, id: string, dto: UpdateAlocacaoDto) {
    const atual = await this.findOne(montagemId, id);
    const { usuario, confirmarAvisos, ...campos } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === StatusConvite.CONVIDADO && atual.status !== StatusConvite.CONVIDADO) {
        this.exigirConfirmacao(
          [await this.avisoConviteAntesDosCirculos(tx, atual.vagaMontagem.equipe, montagemId)],
          confirmarAvisos,
        );
      }

      const alocacao = await tx.alocacao.update({
        where: { id },
        data: {
          ...campos,
          ...(dto.dataConvite && { dataConvite: new Date(dto.dataConvite) }),
          ...(dto.dataResposta && { dataResposta: new Date(dto.dataResposta) }),
        },
      });

      await this.logAtividade.registrar(
        montagemId,
        usuario,
        'ATUALIZOU_ALOCACAO',
        dto.status ? `status -> ${dto.status}` : undefined,
        tx,
      );

      return alocacao;
    });
  }

  async remove(montagemId: string, id: string) {
    const alocacao = await this.findOne(montagemId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.alocacao.delete({ where: { id } });
      await this.logAtividade.registrar(
        montagemId,
        undefined,
        'REMOVEU_ALOCACAO',
        `${alocacao.vagaMontagem.equipe.nome} / ${alocacao.vagaMontagem.cargo.nome}`,
        tx,
      );
      return alocacao;
    });
  }
}
