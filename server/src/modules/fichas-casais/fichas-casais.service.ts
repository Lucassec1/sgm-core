import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFichaCasalDto } from './dto/create-ficha-casal.dto';
import { UpdateFichaCasalDto } from './dto/update-ficha-casal.dto';
import { QueryFichasCasaisDto } from './dto/query-fichas-casais.dto';

// Prisma exige DateTime ISO-8601 completo; datas vindas de <input type="date"> chegam como
// "YYYY-MM-DD" — `new Date(...)` normaliza antes de gravar.
function parseDatasNascimento(dto: { dataNascimentoEle?: string; dataNascimentoEla?: string }) {
  return {
    ...(dto.dataNascimentoEle && { dataNascimentoEle: new Date(dto.dataNascimentoEle) }),
    ...(dto.dataNascimentoEla && { dataNascimentoEla: new Date(dto.dataNascimentoEla) }),
  };
}

@Injectable()
export class FichasCasaisService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFichaCasalDto) {
    return this.prisma.fichaCasal.create({ data: { ...dto, ...parseDatasNascimento(dto) } });
  }

  async findAll(query: QueryFichasCasaisDto) {
    const { paroquiaId, nome, situacao, page = 1, pageSize = 20 } = query;

    const where = {
      paroquiaId,
      ...(nome && {
        OR: [
          { nomeEle: { contains: nome, mode: 'insensitive' as const } },
          { nomeEla: { contains: nome, mode: 'insensitive' as const } },
        ],
      }),
      ...(situacao && { situacao }),
    };

    const [items, total] = await Promise.all([
      this.prisma.fichaCasal.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nomeEle: 'asc' },
      }),
      this.prisma.fichaCasal.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const fichaCasal = await this.prisma.fichaCasal.findUnique({ where: { id } });
    if (!fichaCasal) {
      throw new NotFoundException(`Ficha de casal ${id} não encontrada`);
    }
    return fichaCasal;
  }

  async update(id: string, dto: UpdateFichaCasalDto) {
    await this.findOne(id);
    return this.prisma.fichaCasal.update({ where: { id }, data: { ...dto, ...parseDatasNascimento(dto) } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.fichaCasal.delete({ where: { id } });
  }
}
