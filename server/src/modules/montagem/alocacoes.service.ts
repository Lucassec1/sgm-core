import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Equipe, Prisma, StatusConvite } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import { CreateAlocacaoDto } from './dto/create-alocacao.dto';
import { UpdateAlocacaoDto } from './dto/update-alocacao.dto';

const ALOCACAO_INCLUDE = {
  vagaMontagem: { include: { equipe: true, cargo: true, montagem: { select: { status: true } } } },
  ficha: true,
  fichaCasal: true,
};

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

  // R1 — recusa/desistência bloqueia qualquer nova alocação da mesma pessoa nesse encontro.
  private async verificarBloqueioRecusa(
    tx: Prisma.TransactionClient,
    montagemId: string,
    fichaId?: string,
    fichaCasalId?: string,
  ) {
    const bloqueio = await tx.alocacao.findFirst({
      where: {
        vagaMontagem: { montagemId },
        status: { in: [StatusConvite.RECUSADO, StatusConvite.DESISTIU] },
        ...(fichaId ? { fichaId } : { fichaCasalId }),
      },
    });
    if (bloqueio) {
      throw new ForbiddenException(
        'Pessoa recusou ou desistiu deste encontro — não pode ser realocada (R1)',
      );
    }
  }

  // R2 — aviso de repetição (exige confirmação) + limite real de 3x (exceto Eq. da Visitação).
  private async verificarRepeticaoEquipe(
    tx: Prisma.TransactionClient,
    equipe: Equipe,
    montagemId: string,
    fichaId: string | undefined,
    fichaCasalId: string | undefined,
    confirmarRepeticao: boolean | undefined,
  ) {
    const vezesServidas = await tx.alocacao.count({
      where: {
        vagaMontagem: { equipeId: equipe.id, montagemId: { not: montagemId } },
        status: StatusConvite.ACEITO,
        ...(fichaId ? { fichaId } : { fichaCasalId }),
      },
    });

    if (vezesServidas === 0) return;

    if (vezesServidas >= 3 && !equipe.repeticaoLimiteFlexivel) {
      throw new ForbiddenException(
        `Pessoa já serviu ${vezesServidas}x em ${equipe.nome} — limite de 3x atingido (R2)`,
      );
    }

    if (!confirmarRepeticao) {
      throw new ConflictException({
        code: 'REPETICAO_EQUIPE',
        message: `Pessoa já serviu ${vezesServidas}x em ${equipe.nome} — reenvie com confirmarRepeticao: true pra prosseguir (R2)`,
        vezesServidas,
        equipeNome: equipe.nome,
      });
    }
  }

  // R3 — só coordena quem já serviu como equipista naquela equipe (Grupo A) ou já foi
  // Equipe Dirigente/Comando Geral (Grupo B). Vale sempre pra coordenação por jovem; pra
  // coordenação por casal só vale nas equipes com coordenacaoCasalExigeHistorico=true (hoje
  // só a Visitação — nas demais qualquer casal ativo pode coordenar sem histórico).
  private async verificarCoordenacao(
    tx: Prisma.TransactionClient,
    equipe: Equipe,
    montagemId: string,
    fichaId: string | undefined,
    fichaCasalId: string | undefined,
  ) {
    const grupoA = await tx.alocacao.count({
      where: {
        vagaMontagem: { equipeId: equipe.id, montagemId: { not: montagemId } },
        status: StatusConvite.ACEITO,
        ...(fichaId ? { fichaId } : { fichaCasalId }),
      },
    });
    if (grupoA > 0) return;

    if (fichaId) {
      const ficha = await tx.ficha.findUnique({ where: { id: fichaId } });
      if (ficha?.jaFoiEquipeDirigente) return;
    } else if (fichaCasalId) {
      const fichaCasal = await tx.fichaCasal.findUnique({ where: { id: fichaCasalId } });
      if (fichaCasal?.jaFoiEquipeDirigente) return;
    }

    const comandoGeral = await tx.equipe.findUnique({ where: { slug: 'comando-geral' } });
    if (comandoGeral) {
      const grupoBComandoGeral = await tx.alocacao.count({
        where: {
          vagaMontagem: { equipeId: comandoGeral.id },
          status: StatusConvite.ACEITO,
          ...(fichaId ? { fichaId } : { fichaCasalId }),
        },
      });
      if (grupoBComandoGeral > 0) return;
    }

    throw new ForbiddenException(
      `Pessoa não pode coordenar ${equipe.nome}: nunca serviu nessa equipe nem foi Equipe Dirigente/Comando Geral (R3)`,
    );
  }

  // R4 — Eq. dos Círculos primeiro: as demais equipes (exceto Círculos e Comando Geral) só
  // enviam convite depois que todos os membros dos Círculos aceitaram.
  private async verificarBloqueioConvite(
    tx: Prisma.TransactionClient,
    equipe: Equipe,
    montagemId: string,
  ) {
    if (!equipe.bloqueiaConvitePosCirculos) return;

    const circulos = await tx.equipe.findUnique({ where: { slug: 'circulos' } });
    if (!circulos) return;

    const alocacoesCirculos = await tx.alocacao.findMany({
      where: { vagaMontagem: { equipeId: circulos.id, montagemId } },
      select: { status: true },
    });

    const fechado =
      alocacoesCirculos.length > 0 &&
      alocacoesCirculos.every((a) => a.status === StatusConvite.ACEITO);
    if (!fechado) {
      throw new ForbiddenException(
        'Aguardando Eq. dos Círculos fechar (todos aceitos) antes de convidar outras equipes (R4)',
      );
    }
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
    // Checagens de regra (R1-R4) + escrita numa única transação Serializable: as regras
    // leem contagens que a própria escrita altera (ex.: "máximo 3x" da R2), então ler e
    // gravar precisam enxergar o mesmo estado — sem isso, duas chamadas simultâneas pra
    // mesma pessoa+equipe podem furar o limite. O log (R9) entra na mesma transação.
    return this.comRetrySerializacao(() =>
      this.prisma.$transaction(
        async (tx) => {
          const vaga = await this.getVagaOuFalha(tx, montagemId, dto.vagaMontagemId);

          await this.verificarBloqueioRecusa(tx, montagemId, dto.fichaId, dto.fichaCasalId);
          await this.verificarRepeticaoEquipe(
            tx,
            vaga.equipe,
            montagemId,
            dto.fichaId,
            dto.fichaCasalId,
            dto.confirmarRepeticao,
          );
          const exigeCoordenacao =
            vaga.cargo.ehCoordenacao &&
            (dto.tipoPessoa === 'JOVEM' || vaga.equipe.coordenacaoCasalExigeHistorico);
          if (exigeCoordenacao) {
            await this.verificarCoordenacao(
              tx,
              vaga.equipe,
              montagemId,
              dto.fichaId,
              dto.fichaCasalId,
            );
          }
          if (dto.status === StatusConvite.CONVIDADO) {
            await this.verificarBloqueioConvite(tx, vaga.equipe, montagemId);
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
    return alocacoes.map((a) => this.ocultarSubstituicaoSeFinalizada(a));
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
    const { usuario, ...campos } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === StatusConvite.CONVIDADO && atual.status !== StatusConvite.CONVIDADO) {
        await this.verificarBloqueioConvite(tx, atual.vagaMontagem.equipe, montagemId);
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
