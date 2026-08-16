import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Catálogo global das 16 equipes (somente leitura) — ver prisma/seed-equipes.ts.
@Injectable()
export class EquipesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.equipe.findMany({
      orderBy: { ordem: 'asc' },
      include: { cargos: { orderBy: { ordem: 'asc' } } },
    });
  }
}
