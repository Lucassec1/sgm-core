import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMontagemDto) {
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
    await this.findOne(id);
    return this.prisma.montagem.update({
      where: { id },
      data: { ...dto, ...(dto.data && { data: new Date(dto.data) }) },
      include: VAGAS_INCLUDE,
    });
  }
}
