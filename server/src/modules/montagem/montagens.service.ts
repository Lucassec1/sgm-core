import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StatusConvite } from '@prisma/client';
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

// Quantidade de casais da Eq. da Visitação — proporcional aos jovens vivenciando
// (~1 casal para cada 3 jovens, distribuição não uniforme quando não é múltiplo de 3).
// Ver docs/regras-imutaveis.md, R6.
function calcularCasaisVisitacao(numeroJovensVivenciando: number): number {
  return Math.ceil(numeroJovensVivenciando / 3);
}

@Injectable()
export class MontagensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logAtividade: LogAtividadeService,
  ) {}

  async create(dto: CreateMontagemDto) {
    // R6 — mínimo 40, máximo 60, ou até 72 em caso de sementeira.
    const maximo = dto.ehSementeira ? 72 : 60;
    if (dto.numeroJovensVivenciando < 40 || dto.numeroJovensVivenciando > maximo) {
      throw new BadRequestException(
        `numeroJovensVivenciando deve estar entre 40 e ${maximo}${dto.ehSementeira ? ' (sementeira)' : ''}`,
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
        ehSementeira: dto.ehSementeira ?? false,
        paroquiaSementeiraId: dto.paroquiaSementeiraId,
        quantidadeFichasSementeira: dto.quantidadeFichasSementeira,
        numeroJovensVivenciando: dto.numeroJovensVivenciando,
      },
    });

    await this.prisma.vagaMontagem.createMany({
      data: cargos.map((cargo) => ({
        montagemId: montagem.id,
        equipeId: cargo.equipeId,
        cargoId: cargo.id,
        quantidadeCasais: cargo.quantidadeDinamica
          ? calcularCasaisVisitacao(dto.numeroJovensVivenciando)
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

    const montagem = await this.prisma.montagem.update({
      where: { id },
      data: { ...campos, ...(dto.data && { data: new Date(dto.data) }) },
      include: VAGAS_INCLUDE,
    });

    if (dto.status && dto.status !== anterior.status) {
      await this.logAtividade.registrar(id, usuario, 'MUDOU_STATUS', `${anterior.status} -> ${dto.status}`);
    } else {
      await this.logAtividade.registrar(id, usuario, 'ATUALIZOU_MONTAGEM');
    }

    return montagem;
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
  // não entram.
  async candidatosJovens(montagemId: string) {
    const montagem = await this.findOne(montagemId);

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
