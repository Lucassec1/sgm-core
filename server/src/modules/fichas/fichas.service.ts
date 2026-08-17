import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFichaDto } from './dto/create-ficha.dto';
import { UpdateFichaDto } from './dto/update-ficha.dto';
import { QueryFichasDto } from './dto/query-fichas.dto';

@Injectable()
export class FichasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFichaDto) {
    return this.prisma.ficha.create({ data: { ...dto, dataNascimento: new Date(dto.dataNascimento) } });
  }

  async findAll(query: QueryFichasDto) {
    const {
      paroquiaId,
      nome,
      numeroEncontro,
      situacao,
      page = 1,
      pageSize = 20,
    } = query;

    const where = {
      paroquiaId,
      ...(nome && { nomeCompleto: { contains: nome, mode: 'insensitive' as const } }),
      ...(numeroEncontro && { numeroEncontro }),
      ...(situacao && { situacao }),
    };

    const [items, total] = await Promise.all([
      this.prisma.ficha.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nomeCompleto: 'asc' },
      }),
      this.prisma.ficha.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listNumerosEncontro(paroquiaId: string) {
    const rows = await this.prisma.ficha.findMany({
      where: { paroquiaId },
      distinct: ['numeroEncontro'],
      select: { numeroEncontro: true },
      orderBy: { numeroEncontro: 'desc' },
    });
    return rows.map((r) => r.numeroEncontro);
  }

  async findOne(id: string) {
    const ficha = await this.prisma.ficha.findUnique({ where: { id } });
    if (!ficha) {
      throw new NotFoundException(`Ficha ${id} não encontrada`);
    }
    return ficha;
  }

  async update(id: string, dto: UpdateFichaDto) {
    await this.findOne(id);
    return this.prisma.ficha.update({
      where: { id },
      data: { ...dto, ...(dto.dataNascimento && { dataNascimento: new Date(dto.dataNascimento) }) },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.ficha.delete({ where: { id } });
  }

  // Histórico de equipes servidas — dado gerado pelo módulo Montagem (Alocacao), não
  // armazenado na Ficha (ver docs/requisitos.md, 2.1). Cobre qualquer status, não só
  // ACEITO, pra também mostrar convites em aberto/recusas no histórico.
  async historicoEquipes(id: string) {
    await this.findOne(id);
    return this.prisma.alocacao.findMany({
      where: { fichaId: id },
      include: {
        vagaMontagem: {
          include: { equipe: true, cargo: true, montagem: { select: { numeroEncontro: true, data: true, status: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
