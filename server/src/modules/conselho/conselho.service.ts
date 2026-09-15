import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryConselhoMontagensDto } from './dto/query-conselho-montagens.dto';

// Leitura cross-paróquia de Montagem pro Conselho (R8: "acesso somente leitura... visualizar a
// montagem em andamento em tempo real e as montagens finalizadas de qualquer paróquia... não
// tem acesso às fichas, apenas à montagem"). Consulta o Prisma direto em vez de reusar
// MontagensService — aquele service agora exige e valida paroquiaId em todo método (R7, pro
// caso de conta PAROQUIA), o que não se aplica aqui: o Conselho não tem uma paroquiaId fixa e
// tem permissão de ler qualquer paróquia, então a checagem de posse não se aplica.
const VAGAS_INCLUDE = {
  vagas: {
    include: {
      equipe: true,
      cargo: true,
      alocacoes: { include: { ficha: true, fichaCasal: true } },
    },
    orderBy: [{ equipe: { ordem: 'asc' as const } }, { cargo: { ordem: 'asc' as const } }],
  },
};

@Injectable()
export class ConselhoService {
  constructor(private readonly prisma: PrismaService) {}

  async listarMontagens(query: QueryConselhoMontagensDto) {
    const { paroquiaId, status, page = 1, pageSize = 20 } = query;
    const where = { ...(paroquiaId && { paroquiaId }), ...(status && { status }) };

    const [items, total] = await Promise.all([
      this.prisma.montagem.findMany({
        where,
        include: { paroquia: { select: { id: true, nome: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ paroquia: { nome: 'asc' } }, { numeroEncontro: 'desc' }],
      }),
      this.prisma.montagem.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async obterMontagem(id: string) {
    const montagem = await this.prisma.montagem.findUnique({
      where: { id },
      include: { paroquia: { select: { id: true, nome: true } }, ...VAGAS_INCLUDE },
    });
    if (!montagem) {
      throw new NotFoundException(`Montagem ${id} não encontrada`);
    }
    return montagem;
  }

  async listarObservacoes(montagemId: string) {
    await this.obterMontagem(montagemId);
    return this.prisma.observacaoMontagem.findMany({
      where: { montagemId },
      include: { usuario: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async criarObservacao(montagemId: string, usuarioId: string, texto: string) {
    await this.obterMontagem(montagemId);
    return this.prisma.observacaoMontagem.create({
      data: { montagemId, usuarioId, texto },
      include: { usuario: { select: { nome: true } } },
    });
  }
}
