import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Montagem com as vagas (equipe + cargo) na ordem do quadro — formato devolvido por findOne e
// usado pelas sugestões e pelo resumo.
export const VAGAS_INCLUDE = {
  vagas: {
    include: { equipe: true, cargo: true },
    orderBy: [{ equipe: { ordem: 'asc' as const } }, { cargo: { ordem: 'asc' as const } }],
  },
};

// R7 — garante que a Montagem pedida pertence à paróquia de quem está autenticado. Usa
// NotFoundException (não Forbidden) pra não revelar a existência de registros de outra
// paróquia a quem não tem acesso a eles.
export async function garantirMontagemDaParoquia(
  prisma: PrismaService,
  id: string,
  paroquiaId: string,
) {
  const montagem = await prisma.montagem.findUnique({ where: { id } });
  if (!montagem || montagem.paroquiaId !== paroquiaId) {
    throw new NotFoundException(`Montagem ${id} não encontrada`);
  }
  return montagem;
}

// Mesma checagem de R7, já trazendo as vagas — antes era o findOne do MontagensService.
export async function buscarMontagemComVagas(
  prisma: PrismaService,
  id: string,
  paroquiaId: string,
) {
  const montagem = await prisma.montagem.findUnique({
    where: { id },
    include: VAGAS_INCLUDE,
  });
  if (!montagem || montagem.paroquiaId !== paroquiaId) {
    throw new NotFoundException(`Montagem ${id} não encontrada`);
  }
  return montagem;
}
