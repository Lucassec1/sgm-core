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
  mensagem: string;
}

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

  // R1 — recusou/desistiu deste encontro.
  private async avisoRecusa(
    tx: Prisma.TransactionClient,
    montagemId: string,
    fichaId?: string,
    fichaCasalId?: string,
  ): Promise<AvisoRegra | null> {
    const saida = await tx.alocacao.findFirst({
      where: {
        vagaMontagem: { montagemId },
        status: { in: [StatusConvite.RECUSADO, StatusConvite.DESISTIU] },
        ...(fichaId ? { fichaId } : { fichaCasalId }),
      },
    });
    if (!saida) return null;
    const verbo = saida.status === StatusConvite.DESISTIU ? 'Desistiu' : 'Recusou o convite';
    return {
      regra: 'R1',
      nivel: 'grave',
      mensagem: `${verbo} deste encontro${saida.motivoRecusa ? ` (motivo: ${saida.motivoRecusa})` : ''}.`,
    };
  }

  // R2 — repetição de equipe: avisa a partir da 2ª vez; da 4ª em diante o aviso é grave.
  private async avisoRepeticao(
    tx: Prisma.TransactionClient,
    equipe: Equipe,
    montagemId: string,
    fichaId: string | undefined,
    fichaCasalId: string | undefined,
  ): Promise<AvisoRegra | null> {
    const vezesServidas = await tx.alocacao.count({
      where: {
        vagaMontagem: { equipeId: equipe.id, montagemId: { not: montagemId } },
        status: StatusConvite.ACEITO,
        ...(fichaId ? { fichaId } : { fichaCasalId }),
      },
    });
    if (vezesServidas === 0) return null;
    return {
      regra: 'R2',
      nivel: vezesServidas >= 3 ? 'grave' : 'atencao',
      mensagem: `Já serviu ${vezesServidas}x em ${equipe.nome} — esta seria a ${vezesServidas + 1}ª vez.`,
    };
  }

  // R3 — coordenação: quem nunca serviu como equipista naquela equipe (Grupo A) nem foi
  // Equipe Dirigente/Comando Geral (Grupo B). Vale sempre pra jovem; pra casal só nas equipes
  // com coordenacaoCasalExigeHistorico=true (hoje só a Visitação).
  private async avisoCoordenacao(
    tx: Prisma.TransactionClient,
    equipe: Equipe,
    montagemId: string,
    fichaId: string | undefined,
    fichaCasalId: string | undefined,
  ): Promise<AvisoRegra | null> {
    const grupoA = await tx.alocacao.count({
      where: {
        vagaMontagem: { equipeId: equipe.id, montagemId: { not: montagemId } },
        status: StatusConvite.ACEITO,
        ...(fichaId ? { fichaId } : { fichaCasalId }),
      },
    });
    if (grupoA > 0) return null;

    if (fichaId) {
      const ficha = await tx.ficha.findUnique({ where: { id: fichaId } });
      if (ficha?.jaFoiEquipeDirigente) return null;
    } else if (fichaCasalId) {
      const fichaCasal = await tx.fichaCasal.findUnique({ where: { id: fichaCasalId } });
      if (fichaCasal?.jaFoiEquipeDirigente) return null;
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
      if (grupoBComandoGeral > 0) return null;
    }

    return {
      regra: 'R3',
      nivel: 'grave',
      mensagem: `Nunca serviu como equipista em ${equipe.nome} nem foi Equipe Dirigente/Comando Geral.`,
    };
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
      mensagem: 'A Eq. dos Círculos ainda não fechou (nem todos aceitaram).',
    };
  }

  // Avisos de R1–R4 não bloqueiam (decisão de 14/10/2026, docs/regras-imutaveis.md): sem
  // confirmação, devolvem 409 com a lista; o client mostra e reenvia com confirmarAvisos.
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
    // Avisos de regra (R1-R4) + escrita numa única transação Serializable: os avisos leem
    // contagens que a própria escrita altera (ex.: quantas vezes serviu na equipe, R2), então
    // ler e gravar precisam enxergar o mesmo estado — sem isso, duas alocações simultâneas da
    // mesma pessoa+equipe sairiam sem o aviso certo. O log (R9) entra na mesma transação.
    return this.comRetrySerializacao(() =>
      this.prisma.$transaction(
        async (tx) => {
          const vaga = await this.getVagaOuFalha(tx, montagemId, dto.vagaMontagemId);

          const exigeCoordenacao =
            vaga.cargo.ehCoordenacao &&
            (dto.tipoPessoa === 'JOVEM' || vaga.equipe.coordenacaoCasalExigeHistorico);
          this.exigirConfirmacao(
            [
              await this.avisoRecusa(tx, montagemId, dto.fichaId, dto.fichaCasalId),
              await this.avisoRepeticao(tx, vaga.equipe, montagemId, dto.fichaId, dto.fichaCasalId),
              exigeCoordenacao
                ? await this.avisoCoordenacao(
                    tx,
                    vaga.equipe,
                    montagemId,
                    dto.fichaId,
                    dto.fichaCasalId,
                  )
                : null,
              dto.status === StatusConvite.CONVIDADO
                ? await this.avisoConviteAntesDosCirculos(tx, vaga.equipe, montagemId)
                : null,
            ],
            dto.confirmarAvisos || dto.confirmarRepeticao,
          );

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
