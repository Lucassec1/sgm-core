import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// R7 — o MontagemScopeGuard garante que a Montagem é da paróquia de quem pede, mas o
// fichaId/fichaCasalId vem do body: sem esta checagem, uma paróquia que soubesse o UUID de uma
// ficha alheia conseguiria alocá-la (e depois ler a ficha inteira pela alocação). NotFound em
// vez de Forbidden pra não revelar que a ficha existe em outra paróquia (ver server/CLAUDE.md).
export async function garantirPessoaDaParoquia(
  db: Prisma.TransactionClient,
  montagemId: string,
  pessoa: { fichaId?: string; fichaCasalId?: string },
): Promise<void> {
  if (!pessoa.fichaId && !pessoa.fichaCasalId) return;

  const montagem = await db.montagem.findUnique({
    where: { id: montagemId },
    select: { paroquiaId: true },
  });
  const paroquiaId = montagem?.paroquiaId;

  if (pessoa.fichaId) {
    const ficha =
      paroquiaId &&
      (await db.ficha.findFirst({
        where: { id: pessoa.fichaId, paroquiaId },
        select: { id: true },
      }));
    if (!ficha) throw new NotFoundException(`Ficha ${pessoa.fichaId} não encontrada`);
  }

  if (pessoa.fichaCasalId) {
    const casal =
      paroquiaId &&
      (await db.fichaCasal.findFirst({
        where: { id: pessoa.fichaCasalId, paroquiaId },
        select: { id: true },
      }));
    if (!casal) throw new NotFoundException(`Ficha de casal ${pessoa.fichaCasalId} não encontrada`);
  }
}
