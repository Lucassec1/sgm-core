import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { filtroElegiveis, pessoasElegiveis } from './pessoas-elegiveis';

// R7 — a pessoa colocada numa montagem (alocação, lista de substituição) tem que ser da paróquia
// da montagem, salvo as exceções da implantação (pessoas-elegiveis.ts). NotFound, não Forbidden:
// não revela que a ficha existe em outra paróquia.
export async function garantirPessoaDaParoquia(
  db: Prisma.TransactionClient,
  montagemId: string,
  pessoa: { fichaId?: string; fichaCasalId?: string },
): Promise<void> {
  if (!pessoa.fichaId && !pessoa.fichaCasalId) return;

  const montagem = await db.montagem.findUnique({
    where: { id: montagemId },
    select: { paroquiaId: true, implantacaoId: true },
  });
  const elegiveis = montagem ? await pessoasElegiveis(db, montagem) : null;

  if (pessoa.fichaId) {
    const ficha =
      elegiveis &&
      (await db.ficha.findFirst({
        where: { id: pessoa.fichaId, ...filtroElegiveis(elegiveis, 'fichaIds') },
        select: { id: true },
      }));
    if (!ficha) {
      throw new NotFoundException(`Ficha ${pessoa.fichaId} não encontrada`);
    }
  }

  if (pessoa.fichaCasalId) {
    const casal =
      elegiveis &&
      (await db.fichaCasal.findFirst({
        where: { id: pessoa.fichaCasalId, ...filtroElegiveis(elegiveis, 'fichaCasalIds') },
        select: { id: true },
      }));
    if (!casal) {
      throw new NotFoundException(`Ficha de casal ${pessoa.fichaCasalId} não encontrada`);
    }
  }
}
