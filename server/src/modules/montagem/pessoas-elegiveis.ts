import { FaseImplantacao, Prisma } from '@prisma/client';

// Quem pode entrar numa montagem (candidatos, alocação, lista de substituição). Regra geral da
// R7: só fichas da paróquia da montagem. Exceções da implantação (docs/regras-imutaveis.md),
// todas concentradas aqui:
// - IMPLANTACAO, num encontro de anexo da afilhada: fichas da afilhada e da madrinha;
// - ACOMPANHAMENTO, em qualquer montagem da afilhada: as dela + as fichas liberadas pela madrinha;
// - ENCERRADA (ou sem vínculo): isolamento total.
export interface Elegiveis {
  paroquiaIds: string[];
  liberadas: { fichaIds: string[]; fichaCasalIds: string[] };
}

export async function pessoasElegiveis(
  db: Prisma.TransactionClient,
  montagem: { paroquiaId: string; implantacaoId: string | null },
): Promise<Elegiveis> {
  const nenhuma = { fichaIds: [], fichaCasalIds: [] };
  const vinculo = await db.implantacao.findFirst({
    where: {
      afilhadaId: montagem.paroquiaId,
      fase: { in: [FaseImplantacao.IMPLANTACAO, FaseImplantacao.ACOMPANHAMENTO] },
    },
  });

  if (vinculo?.fase === FaseImplantacao.IMPLANTACAO && montagem.implantacaoId === vinculo.id) {
    return { paroquiaIds: [vinculo.afilhadaId, vinculo.madrinhaId], liberadas: nenhuma };
  }
  if (vinculo?.fase === FaseImplantacao.ACOMPANHAMENTO) {
    const liberacoes = await db.liberacaoFicha.findMany({
      where: { implantacaoId: vinculo.id },
      select: { fichaId: true, fichaCasalId: true },
    });
    return {
      paroquiaIds: [montagem.paroquiaId],
      liberadas: {
        fichaIds: liberacoes.flatMap((l) => (l.fichaId ? [l.fichaId] : [])),
        fichaCasalIds: liberacoes.flatMap((l) => (l.fichaCasalId ? [l.fichaCasalId] : [])),
      },
    };
  }
  return { paroquiaIds: [montagem.paroquiaId], liberadas: nenhuma };
}

// `where` de ficha/casal pras buscas de candidatos. Sem exceção, o mesmo filtro de sempre.
export function filtroElegiveis(e: Elegiveis, tipo: 'fichaIds' | 'fichaCasalIds') {
  const liberadas = e.liberadas[tipo];
  if (e.paroquiaIds.length === 1 && liberadas.length === 0) {
    return { paroquiaId: e.paroquiaIds[0] };
  }
  return {
    OR: [
      { paroquiaId: { in: e.paroquiaIds } },
      ...(liberadas.length ? [{ id: { in: liberadas } }] : []),
    ],
  };
}
