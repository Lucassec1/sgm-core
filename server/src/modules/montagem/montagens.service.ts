import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Sexo, StatusConvite } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import { CreateMontagemDto } from './dto/create-montagem.dto';
import { UpdateMontagemDto } from './dto/update-montagem.dto';
import { QueryMontagensDto } from './dto/query-montagens.dto';
import { toCsv } from '../../common/export/csv.util';

const VAGAS_INCLUDE = {
  vagas: {
    include: { equipe: true, cargo: true },
    orderBy: [{ equipe: { ordem: 'asc' as const } }, { cargo: { ordem: 'asc' as const } }],
  },
};

// Implantação: encontro que lança o Segue-me numa paróquia afilhada. Traz sempre 12 jovens
// "sementeiras" de lá (somados aos jovens locais) e exige 4 casais afilhados na Visitação —
// números fixos, não digitados pelo usuário. Ver docs/regras-imutaveis.md, R6.
const JOVENS_SEMENTEIRA_IMPLANTACAO = 12;
const CASAIS_AFILHADA_IMPLANTACAO = 4;

// Quantidade de casais da Eq. da Visitação — proporcional aos jovens vivenciando LOCAIS
// (~1 casal para cada 3 jovens, distribuição não uniforme quando não é múltiplo de 3). Numa
// implantação, os 12 jovens sementeira não entram nessa conta (eles não são "nossos"), mas
// somam-se 4 casais fixos da paróquia afilhada. Ver docs/regras-imutaveis.md, R6.
function calcularCasaisVisitacao(numeroJovensVivenciando: number, ehImplantacao: boolean): number {
  if (ehImplantacao) {
    const jovensLocais = numeroJovensVivenciando - JOVENS_SEMENTEIRA_IMPLANTACAO;
    return Math.ceil(jovensLocais / 3) + CASAIS_AFILHADA_IMPLANTACAO;
  }
  return Math.ceil(numeroJovensVivenciando / 3);
}

@Injectable()
export class MontagensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logAtividade: LogAtividadeService,
  ) {}

  // R7 — garante que a Montagem pedida pertence à paróquia de quem está autenticado. Usa
  // NotFoundException (não Forbidden) pra não revelar a existência de registros de outra
  // paróquia a quem não tem acesso a eles.
  private async garantirPertence(id: string, paroquiaId: string) {
    const montagem = await this.prisma.montagem.findUnique({ where: { id } });
    if (!montagem || montagem.paroquiaId !== paroquiaId) {
      throw new NotFoundException(`Montagem ${id} não encontrada`);
    }
    return montagem;
  }

  async create(dto: CreateMontagemDto, paroquiaId: string) {
    const ehImplantacao = dto.ehImplantacao ?? false;
    // R6 — mínimo 40, máximo 60 jovens locais; numa implantação somam-se os 12 sementeira.
    const minimo = 40 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
    const maximo = 60 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
    if (dto.numeroJovensVivenciando < minimo || dto.numeroJovensVivenciando > maximo) {
      throw new BadRequestException(
        `numeroJovensVivenciando deve estar entre ${minimo} e ${maximo}${ehImplantacao ? ' (implantação: 40-60 locais + 12 sementeira)' : ''}`,
      );
    }

    // Montagem + vagas + log numa transação só: sem isso, uma falha no createMany deixaria
    // uma Montagem sem nenhuma vaga, e uma falha no log deixaria a criação sem rastro (R9).
    const montagem = await this.prisma.$transaction(async (tx) => {
      const ultimaMontagem = await tx.montagem.findFirst({
        where: { paroquiaId },
        orderBy: { numeroEncontro: 'desc' },
        select: { numeroEncontro: true },
      });
      const numeroEncontro = (ultimaMontagem?.numeroEncontro ?? 0) + 1;

      const cargos = await tx.cargo.findMany({ include: { equipe: true } });

      const criada = await tx.montagem.create({
        data: {
          paroquiaId,
          numeroEncontro,
          data: new Date(dto.data),
          padroeiro: dto.padroeiro,
          diretorEspiritual: dto.diretorEspiritual,
          ehImplantacao,
          paroquiaAfilhadaNome: dto.paroquiaAfilhadaNome,
          quantidadeJovensSementeira: ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : undefined,
          quantidadeCasaisAfilhada: ehImplantacao ? CASAIS_AFILHADA_IMPLANTACAO : undefined,
          numeroJovensVivenciando: dto.numeroJovensVivenciando,
        },
      });

      await tx.vagaMontagem.createMany({
        data: cargos.map((cargo) => ({
          montagemId: criada.id,
          equipeId: cargo.equipeId,
          cargoId: cargo.id,
          quantidadeCasais: cargo.quantidadeDinamica
            ? calcularCasaisVisitacao(dto.numeroJovensVivenciando, ehImplantacao)
            : cargo.quantidadeCasais,
          quantidadeRapazes: cargo.quantidadeRapazes,
          quantidadeMocas: cargo.quantidadeMocas,
        })),
      });

      await this.logAtividade.registrar(
        criada.id,
        dto.usuario,
        'CRIOU_MONTAGEM',
        `Encontro nº ${numeroEncontro}`,
        tx,
      );

      return criada;
    });

    return this.findOne(montagem.id, paroquiaId);
  }

  async findAll(query: QueryMontagensDto, paroquiaId: string) {
    const { status, page = 1, pageSize = 20 } = query;

    const where = {
      paroquiaId,
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.montagem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { numeroEncontro: 'desc' },
      }),
      this.prisma.montagem.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string, paroquiaId: string) {
    const montagem = await this.prisma.montagem.findUnique({
      where: { id },
      include: VAGAS_INCLUDE,
    });
    if (!montagem || montagem.paroquiaId !== paroquiaId) {
      throw new NotFoundException(`Montagem ${id} não encontrada`);
    }
    return montagem;
  }

  // Exportação simples (docs/producao.md, item 4) — quem está alocado em cada vaga da montagem.
  async exportCsv(id: string, paroquiaId: string) {
    await this.garantirPertence(id, paroquiaId);

    const vagas = await this.prisma.vagaMontagem.findMany({
      where: { montagemId: id },
      include: {
        equipe: true,
        cargo: true,
        alocacoes: { include: { ficha: true, fichaCasal: true } },
      },
      orderBy: [{ equipe: { ordem: 'asc' } }, { cargo: { ordem: 'asc' } }],
    });

    const headers = ['Equipe', 'Cargo', 'Pessoa', 'Status do convite'];
    const rows = vagas.flatMap((vaga) =>
      vaga.alocacoes.map((alocacao) => [
        vaga.equipe.nome,
        vaga.cargo.nome,
        alocacao.ficha?.nomeCompleto ??
          (alocacao.fichaCasal
            ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}`
            : ''),
        alocacao.status,
      ]),
    );
    return toCsv(headers, rows);
  }

  async update(id: string, dto: UpdateMontagemDto, paroquiaId: string) {
    const anterior = await this.findOne(id, paroquiaId);
    const { usuario, ...campos } = dto;

    // Recalcula a vaga dinâmica (Componentes da Visitação, R6) sempre que o nº de jovens
    // vivenciando ou o flag de implantação mudarem — o encontro é montado aos poucos, então
    // o número final de jovens só fecha depois de criada a Montagem (ver docs/ux-e-fluxos.md).
    const numeroJovensVivenciando = dto.numeroJovensVivenciando ?? anterior.numeroJovensVivenciando;
    const ehImplantacao = dto.ehImplantacao ?? anterior.ehImplantacao;
    const precisaRecalcular =
      dto.numeroJovensVivenciando !== undefined || dto.ehImplantacao !== undefined;

    if (precisaRecalcular) {
      const minimo = 40 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
      const maximo = 60 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
      if (numeroJovensVivenciando < minimo || numeroJovensVivenciando > maximo) {
        throw new BadRequestException(
          `numeroJovensVivenciando deve estar entre ${minimo} e ${maximo}${ehImplantacao ? ' (implantação: 40-60 locais + 12 sementeira)' : ''}`,
        );
      }
    }

    // update da Montagem + recálculo da vaga dinâmica (R6) + log numa transação só.
    const montagem = await this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.montagem.update({
        where: { id },
        data: {
          ...campos,
          ...(dto.data && { data: new Date(dto.data) }),
          ...(dto.ehImplantacao !== undefined && {
            quantidadeJovensSementeira: dto.ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : null,
            quantidadeCasaisAfilhada: dto.ehImplantacao ? CASAIS_AFILHADA_IMPLANTACAO : null,
          }),
        },
        include: VAGAS_INCLUDE,
      });

      if (precisaRecalcular) {
        const vagaDinamica = atualizada.vagas.find((v) => v.cargo.quantidadeDinamica);
        if (vagaDinamica) {
          await tx.vagaMontagem.update({
            where: { id: vagaDinamica.id },
            data: {
              quantidadeCasais: calcularCasaisVisitacao(numeroJovensVivenciando, ehImplantacao),
            },
          });
        }
      }

      if (dto.status && dto.status !== anterior.status) {
        await this.logAtividade.registrar(
          id,
          usuario,
          'MUDOU_STATUS',
          `${anterior.status} -> ${dto.status}`,
          tx,
        );
      } else {
        await this.logAtividade.registrar(id, usuario, 'ATUALIZOU_MONTAGEM', undefined, tx);
      }

      return atualizada;
    });

    return precisaRecalcular ? this.findOne(id, paroquiaId) : montagem;
  }

  // R3 — sugestão de coordenadores. Desde 14/10/2026 R3 não bloqueia (só avisa), então a lista
  // traz todo mundo, em três grupos:
  // - Grupo A: já serviu (aceito) como equipista nessa equipe — quem foi avaliado como "pode
  //   coordenar" nela vem primeiro (`avaliadoPodeCoordenar`);
  // - Grupo B: já foi Equipe Dirigente ou Comando Geral;
  // - outros: as demais fichas ativas da paróquia (escolher alguém daqui gera aviso de R3).
  // Tudo filtrado pela paróquia da montagem (R7).
  async coordenadoresSugeridos(montagemId: string, equipeId: string, paroquiaId: string) {
    await this.findOne(montagemId, paroquiaId);
    const equipe = await this.prisma.equipe.findUnique({ where: { id: equipeId } });
    if (!equipe) {
      throw new NotFoundException(`Equipe ${equipeId} não encontrada`);
    }
    const comandoGeral = await this.prisma.equipe.findUnique({ where: { slug: 'comando-geral' } });

    const serviuNaEquipe = {
      some: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId } },
    };
    const serviuNoComandoGeral = comandoGeral
      ? { some: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId: comandoGeral.id } } }
      : undefined;
    // Avaliações "pode coordenar" dadas nas alocações dessa equipe — só pra ordenar o Grupo A.
    const avaliacoesNaEquipe = {
      where: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId }, podeCoordenar: true },
      select: { id: true },
    };
    const ativas = { paroquiaId, situacao: 'ATIVA' as const };

    const [fichas, fichasCasais] = await Promise.all([
      this.prisma.ficha.findMany({
        where: ativas,
        include: { alocacoes: avaliacoesNaEquipe },
        orderBy: { nomeCompleto: 'asc' },
      }),
      this.prisma.fichaCasal.findMany({
        where: ativas,
        include: { alocacoes: avaliacoesNaEquipe },
        orderBy: { nomeEle: 'asc' },
      }),
    ]);
    const soId = { select: { id: true } } as const;
    const [grupoAFichas, grupoACasais, comandoGeralFichas, comandoGeralCasais] = await Promise.all([
      this.prisma.ficha.findMany({ where: { ...ativas, alocacoes: serviuNaEquipe }, ...soId }),
      this.prisma.fichaCasal.findMany({ where: { ...ativas, alocacoes: serviuNaEquipe }, ...soId }),
      serviuNoComandoGeral
        ? this.prisma.ficha.findMany({
            where: { ...ativas, alocacoes: serviuNoComandoGeral },
            ...soId,
          })
        : Promise.resolve([]),
      serviuNoComandoGeral
        ? this.prisma.fichaCasal.findMany({
            where: { ...ativas, alocacoes: serviuNoComandoGeral },
            ...soId,
          })
        : Promise.resolve([]),
    ]);
    const ids = (linhas: { id: string }[]) => new Set(linhas.map((l) => l.id));
    const [idsGrupoA, idsGrupoACasais, idsComandoGeral, idsComandoGeralCasais] = [
      ids(grupoAFichas),
      ids(grupoACasais),
      ids(comandoGeralFichas),
      ids(comandoGeralCasais),
    ];

    const separar = <
      T extends { id: string; jaFoiEquipeDirigente: boolean; alocacoes: { id: string }[] },
    >(
      itens: T[],
      grupoA: Set<string>,
      comandoGeralIds: Set<string>,
    ) => {
      const semAvaliacoes = (i: T) => {
        const { alocacoes, ...resto } = i;
        return { ...resto, avaliadoPodeCoordenar: alocacoes.length > 0 };
      };
      const a = itens
        .filter((i) => grupoA.has(i.id))
        .map(semAvaliacoes)
        .sort((x, y) => Number(y.avaliadoPodeCoordenar) - Number(x.avaliadoPodeCoordenar));
      const b = itens
        .filter((i) => !grupoA.has(i.id) && (i.jaFoiEquipeDirigente || comandoGeralIds.has(i.id)))
        .map(semAvaliacoes);
      const naoSugeridos = new Set([...a, ...b].map((i) => i.id));
      const outros = itens.filter((i) => !naoSugeridos.has(i.id)).map(semAvaliacoes);
      return { a, b, outros };
    };

    const jovens = separar(fichas, idsGrupoA, idsComandoGeral);
    const casais = separar(fichasCasais, idsGrupoACasais, idsComandoGeralCasais);

    return {
      grupoA: { fichas: jovens.a, fichasCasais: casais.a },
      grupoB: { fichas: jovens.b, fichasCasais: casais.b },
      outros: { fichas: jovens.outros, fichasCasais: casais.outros },
    };
  }

  // R5 — prioridade de convite: 1º jovens do encontro imediatamente anterior, depois os
  // demais em ordem decrescente. Fichas inativas não entram. Quem recusou/desistiu desta
  // montagem entra no fim, marcado (`recusouNesteEncontro`) — R1 avisa, não bloqueia. `vagaMontagemId`, quando informado, filtra também por sexo compatível com a
  // vaga (VagaMontagem.quantidadeRapazes/quantidadeMocas — ver docs/requisitos.md, 2.2).
  async candidatosJovens(montagemId: string, paroquiaId: string, vagaMontagemId?: string) {
    const montagem = await this.findOne(montagemId, paroquiaId);

    let sexos: Sexo[] | undefined;
    if (vagaMontagemId) {
      const vaga = montagem.vagas.find((v) => v.id === vagaMontagemId);
      if (!vaga) {
        throw new BadRequestException(
          `Vaga ${vagaMontagemId} não pertence à montagem ${montagemId}`,
        );
      }
      sexos = [
        ...(vaga.quantidadeRapazes > 0 ? [Sexo.RAPAZ] : []),
        ...(vaga.quantidadeMocas > 0 ? [Sexo.MOCA] : []),
      ];
    }

    const saidas = await this.prisma.alocacao.findMany({
      where: {
        vagaMontagem: { montagemId },
        status: { in: [StatusConvite.RECUSADO, StatusConvite.DESISTIU] },
        fichaId: { not: null },
      },
      select: { fichaId: true },
    });
    const idsSaidas = new Set(saidas.map((a) => a.fichaId).filter((id): id is string => !!id));

    const fichas = await this.prisma.ficha.findMany({
      where: {
        paroquiaId: montagem.paroquiaId,
        situacao: 'ATIVA',
        ...(sexos && { sexo: { in: sexos } }),
      },
    });

    const encontroAnterior = montagem.numeroEncontro - 1;
    return fichas
      .map((f) => ({ ...f, recusouNesteEncontro: idsSaidas.has(f.id) }))
      .sort((a, b) => {
        if (a.recusouNesteEncontro !== b.recusouNesteEncontro)
          return a.recusouNesteEncontro ? 1 : -1;
        const aEhAnterior = a.numeroEncontro === encontroAnterior;
        const bEhAnterior = b.numeroEncontro === encontroAnterior;
        if (aEhAnterior !== bEhAnterior) return aEhAnterior ? -1 : 1;
        return b.numeroEncontro - a.numeroEncontro;
      });
  }

  async listarLog(montagemId: string, paroquiaId: string) {
    await this.garantirPertence(montagemId, paroquiaId);
    return this.logAtividade.listar(montagemId);
  }

  // Leitura, pelo lado da paróquia, das observações que o Conselho deixou na montagem (R8) —
  // antes só o Conselho lia, e o retorno pra paróquia dependia de aviso fora do sistema. Escrita
  // continua exclusiva do Conselho (ConselhoMontagensController). Só o nome de quem escreveu sai,
  // nunca o id/usuário da conta.
  async listarObservacoes(montagemId: string, paroquiaId: string) {
    await this.garantirPertence(montagemId, paroquiaId);
    return this.prisma.observacaoMontagem.findMany({
      where: { montagemId },
      select: { id: true, texto: true, createdAt: true, usuario: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Painel "como foi esse encontro" (docs/historico/propostas.md, proposta #2) — lê o LogAtividade (R9)
  // e a Alocacao já existentes, sem schema novo. Duas métricas do escopo original da proposta
  // não são calculáveis com o que o log guarda hoje e foram substituídas por uma versão
  // honesta do mesmo espírito:
  // - "tempo até 100% preenchida" -> vira "tempo até finalizar" (ATUALIZOU_ALOCACAO não grava
  //   qual vaga mudou de status, só o texto "status -> X", então não dá pra saber quando cada
  //   vaga bateu o total exigido — mas a finalização é um marco real e já fica no log).
  // - "equipe que demorou mais pra fechar" -> vira "equipe com mais movimentação" (contagem de
  //   CRIOU_ALOCACAO + REMOVEU_ALOCACAO por equipe — essas duas ações são as únicas que citam a
  //   equipe no `detalhes`; é um proxy de "quanto foi mexido", não de duração real).
  async resumo(montagemId: string, paroquiaId: string) {
    const montagem = await this.findOne(montagemId, paroquiaId);

    const [logsMovimentacao, totalRecusasDesistencias, totalSubstituicoes, duracaoMs] =
      await Promise.all([
        this.prisma.logAtividade.findMany({
          where: { montagemId, acao: { in: ['CRIOU_ALOCACAO', 'REMOVEU_ALOCACAO'] } },
          select: { detalhes: true },
        }),
        this.prisma.alocacao.count({
          where: {
            vagaMontagem: { montagemId },
            status: { in: [StatusConvite.RECUSADO, StatusConvite.DESISTIU] },
          },
        }),
        this.prisma.alocacao.count({
          where: { vagaMontagem: { montagemId }, status: StatusConvite.SUBSTITUIDO },
        }),
        this.duracaoAteFinalizarMs(montagemId, montagem.createdAt, montagem.status),
      ]);

    return {
      montagemId,
      numeroEncontro: montagem.numeroEncontro,
      status: montagem.status,
      duracaoMs,
      equipeMaisMovimentada: this.equipeComMaisMovimentacao(
        logsMovimentacao.map((l) => l.detalhes),
      ),
      totalRecusasDesistencias,
      totalSubstituicoes,
      historico: await this.historicoDuracao(montagem.paroquiaId, montagem.numeroEncontro),
    };
  }

  // `detalhes` de CRIOU_ALOCACAO/REMOVEU_ALOCACAO é sempre "<equipe> / <cargo>" (ver
  // alocacoes.service.ts) — extrai só a equipe pra contar movimentação por equipe.
  private equipeComMaisMovimentacao(detalhesDosLogs: (string | null)[]) {
    const contagem = new Map<string, number>();
    for (const detalhes of detalhesDosLogs) {
      const equipe = detalhes?.split(' / ')[0]?.trim();
      if (!equipe) continue;
      contagem.set(equipe, (contagem.get(equipe) ?? 0) + 1);
    }
    const [nome, movimentacoes] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return nome ? { nome, movimentacoes: movimentacoes as number } : null;
  }

  private async duracaoAteFinalizarMs(
    montagemId: string,
    criadoEm: Date,
    status: string,
  ): Promise<number | null> {
    if (status !== 'FINALIZADA') return null;
    // Se a montagem foi reaberta e finalizada de novo, usa a finalização mais recente —
    // é o marco de quando ela chegou no estado atual.
    const finalizacao = await this.prisma.logAtividade.findFirst({
      where: { montagemId, acao: 'MUDOU_STATUS', detalhes: { endsWith: '-> FINALIZADA' } },
      orderBy: { createdAt: 'desc' },
    });
    return finalizacao ? finalizacao.createdAt.getTime() - criadoEm.getTime() : null;
  }

  // Últimos até 3 encontros finalizados da mesma paróquia, antes deste — pra comparar "esse
  // encontro foi mais difícil de montar que o passado, ou foi impressão minha?" (proposta #2).
  private async historicoDuracao(paroquiaId: string, numeroEncontroAtual: number) {
    const anteriores = await this.prisma.montagem.findMany({
      where: { paroquiaId, status: 'FINALIZADA', numeroEncontro: { lt: numeroEncontroAtual } },
      orderBy: { numeroEncontro: 'desc' },
      take: 3,
      select: { id: true, numeroEncontro: true, createdAt: true, status: true },
    });

    return Promise.all(
      anteriores.reverse().map(async (m) => ({
        numeroEncontro: m.numeroEncontro,
        duracaoMs: await this.duracaoAteFinalizarMs(m.id, m.createdAt, m.status),
      })),
    );
  }
}
