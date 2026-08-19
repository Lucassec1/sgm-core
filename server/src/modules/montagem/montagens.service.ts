import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Sexo, StatusConvite } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import { CreateMontagemDto } from './dto/create-montagem.dto';
import { UpdateMontagemDto } from './dto/update-montagem.dto';
import { QueryMontagensDto } from './dto/query-montagens.dto';

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

  async create(dto: CreateMontagemDto) {
    const ehImplantacao = dto.ehImplantacao ?? false;
    // R6 — mínimo 40, máximo 60 jovens locais; numa implantação somam-se os 12 sementeira.
    const minimo = 40 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
    const maximo = 60 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
    if (dto.numeroJovensVivenciando < minimo || dto.numeroJovensVivenciando > maximo) {
      throw new BadRequestException(
        `numeroJovensVivenciando deve estar entre ${minimo} e ${maximo}${ehImplantacao ? ' (implantação: 40-60 locais + 12 sementeira)' : ''}`,
      );
    }

    const ultimaMontagem = await this.prisma.montagem.findFirst({
      where: { paroquiaId: dto.paroquiaId },
      orderBy: { numeroEncontro: 'desc' },
      select: { numeroEncontro: true },
    });
    const numeroEncontro = (ultimaMontagem?.numeroEncontro ?? 0) + 1;

    const cargos = await this.prisma.cargo.findMany({ include: { equipe: true } });

    const montagem = await this.prisma.montagem.create({
      data: {
        paroquiaId: dto.paroquiaId,
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

    await this.prisma.vagaMontagem.createMany({
      data: cargos.map((cargo) => ({
        montagemId: montagem.id,
        equipeId: cargo.equipeId,
        cargoId: cargo.id,
        quantidadeCasais: cargo.quantidadeDinamica
          ? calcularCasaisVisitacao(dto.numeroJovensVivenciando, ehImplantacao)
          : cargo.quantidadeCasais,
        quantidadeRapazes: cargo.quantidadeRapazes,
        quantidadeMocas: cargo.quantidadeMocas,
      })),
    });

    await this.logAtividade.registrar(montagem.id, dto.usuario, 'CRIOU_MONTAGEM', `Encontro nº ${numeroEncontro}`);

    return this.findOne(montagem.id);
  }

  async findAll(query: QueryMontagensDto) {
    const { paroquiaId, status, page = 1, pageSize = 20 } = query;

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

  async findOne(id: string) {
    const montagem = await this.prisma.montagem.findUnique({
      where: { id },
      include: VAGAS_INCLUDE,
    });
    if (!montagem) {
      throw new NotFoundException(`Montagem ${id} não encontrada`);
    }
    return montagem;
  }

  async update(id: string, dto: UpdateMontagemDto) {
    const anterior = await this.findOne(id);
    const { usuario, ...campos } = dto;

    // Recalcula a vaga dinâmica (Componentes da Visitação, R6) sempre que o nº de jovens
    // vivenciando ou o flag de implantação mudarem — o encontro é montado aos poucos, então
    // o número final de jovens só fecha depois de criada a Montagem (ver docs/ux-e-fluxos.md).
    const numeroJovensVivenciando = dto.numeroJovensVivenciando ?? anterior.numeroJovensVivenciando;
    const ehImplantacao = dto.ehImplantacao ?? anterior.ehImplantacao;
    const precisaRecalcular = dto.numeroJovensVivenciando !== undefined || dto.ehImplantacao !== undefined;

    if (precisaRecalcular) {
      const minimo = 40 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
      const maximo = 60 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
      if (numeroJovensVivenciando < minimo || numeroJovensVivenciando > maximo) {
        throw new BadRequestException(
          `numeroJovensVivenciando deve estar entre ${minimo} e ${maximo}${ehImplantacao ? ' (implantação: 40-60 locais + 12 sementeira)' : ''}`,
        );
      }
    }

    const montagem = await this.prisma.montagem.update({
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
      const vagaDinamica = montagem.vagas.find((v) => v.cargo.quantidadeDinamica);
      if (vagaDinamica) {
        await this.prisma.vagaMontagem.update({
          where: { id: vagaDinamica.id },
          data: { quantidadeCasais: calcularCasaisVisitacao(numeroJovensVivenciando, ehImplantacao) },
        });
      }
    }

    if (dto.status && dto.status !== anterior.status) {
      await this.logAtividade.registrar(id, usuario, 'MUDOU_STATUS', `${anterior.status} -> ${dto.status}`);
    } else {
      await this.logAtividade.registrar(id, usuario, 'ATUALIZOU_MONTAGEM');
    }

    return precisaRecalcular ? this.findOne(id) : montagem;
  }

  // R3 — sugestão de coordenadores: Grupo A (já serviu como equipista naquela equipe) e
  // Grupo B (já foi Equipe Dirigente ou Comando Geral, pode coordenar qualquer equipe).
  async coordenadoresSugeridos(montagemId: string, equipeId: string) {
    await this.findOne(montagemId);
    const equipe = await this.prisma.equipe.findUnique({ where: { id: equipeId } });
    if (!equipe) {
      throw new NotFoundException(`Equipe ${equipeId} não encontrada`);
    }
    const comandoGeral = await this.prisma.equipe.findUnique({ where: { slug: 'comando-geral' } });

    const [grupoAFichas, grupoAFichasCasais, dirigentesFichas, dirigentesFichasCasais, comandoGeralFichas, comandoGeralFichasCasais] =
      await Promise.all([
        this.prisma.ficha.findMany({
          where: { situacao: 'ATIVA', alocacoes: { some: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId } } } },
        }),
        this.prisma.fichaCasal.findMany({
          where: { situacao: 'ATIVA', alocacoes: { some: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId } } } },
        }),
        this.prisma.ficha.findMany({ where: { situacao: 'ATIVA', jaFoiEquipeDirigente: true } }),
        this.prisma.fichaCasal.findMany({ where: { situacao: 'ATIVA', jaFoiEquipeDirigente: true } }),
        comandoGeral
          ? this.prisma.ficha.findMany({
              where: { situacao: 'ATIVA', alocacoes: { some: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId: comandoGeral.id } } } },
            })
          : Promise.resolve([]),
        comandoGeral
          ? this.prisma.fichaCasal.findMany({
              where: { situacao: 'ATIVA', alocacoes: { some: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId: comandoGeral.id } } } },
            })
          : Promise.resolve([]),
      ]);

    const uniquePorId = <T extends { id: string }>(items: T[]) => [...new Map(items.map((i) => [i.id, i])).values()];

    return {
      grupoA: {
        fichas: uniquePorId(grupoAFichas),
        fichasCasais: uniquePorId(grupoAFichasCasais),
      },
      grupoB: {
        fichas: uniquePorId([...dirigentesFichas, ...comandoGeralFichas]),
        fichasCasais: uniquePorId([...dirigentesFichasCasais, ...comandoGeralFichasCasais]),
      },
    };
  }

  // R5 — prioridade de convite: 1º jovens do encontro imediatamente anterior, depois os
  // demais em ordem decrescente. Fichas inativas ou já recusadas/desistentes nesta montagem
  // não entram. `vagaMontagemId`, quando informado, filtra também por sexo compatível com a
  // vaga (VagaMontagem.quantidadeRapazes/quantidadeMocas — ver docs/requisitos.md, 2.2).
  async candidatosJovens(montagemId: string, vagaMontagemId?: string) {
    const montagem = await this.findOne(montagemId);

    let sexos: Sexo[] | undefined;
    if (vagaMontagemId) {
      const vaga = montagem.vagas.find((v) => v.id === vagaMontagemId);
      if (!vaga) {
        throw new BadRequestException(`Vaga ${vagaMontagemId} não pertence à montagem ${montagemId}`);
      }
      sexos = [
        ...(vaga.quantidadeRapazes > 0 ? [Sexo.RAPAZ] : []),
        ...(vaga.quantidadeMocas > 0 ? [Sexo.MOCA] : []),
      ];
    }

    const excluidos = await this.prisma.alocacao.findMany({
      where: {
        vagaMontagem: { montagemId },
        status: { in: [StatusConvite.RECUSADO, StatusConvite.DESISTIU] },
        fichaId: { not: null },
      },
      select: { fichaId: true },
    });
    const idsExcluidos = excluidos.map((a) => a.fichaId).filter((id): id is string => !!id);

    const fichas = await this.prisma.ficha.findMany({
      where: {
        paroquiaId: montagem.paroquiaId,
        situacao: 'ATIVA',
        id: { notIn: idsExcluidos },
        ...(sexos && { sexo: { in: sexos } }),
      },
    });

    const encontroAnterior = montagem.numeroEncontro - 1;
    return fichas.sort((a, b) => {
      const aEhAnterior = a.numeroEncontro === encontroAnterior;
      const bEhAnterior = b.numeroEncontro === encontroAnterior;
      if (aEhAnterior !== bEhAnterior) return aEhAnterior ? -1 : 1;
      return b.numeroEncontro - a.numeroEncontro;
    });
  }

  async listarLog(montagemId: string) {
    await this.findOne(montagemId);
    return this.logAtividade.listar(montagemId);
  }
}
