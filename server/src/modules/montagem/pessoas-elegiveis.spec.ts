import { NotFoundException } from '@nestjs/common';
import { filtroElegiveis, pessoasElegiveis } from './pessoas-elegiveis';
import { garantirPessoaDaParoquia } from './pessoa-da-paroquia';

function criarDb() {
  return {
    implantacao: { findFirst: jest.fn() },
    liberacaoFicha: { findMany: jest.fn().mockResolvedValue([]) },
    montagem: { findUnique: jest.fn() },
    ficha: { findFirst: jest.fn() },
    fichaCasal: { findFirst: jest.fn() },
  };
}

// findFirst fake que aplica o `where` gerado por filtroElegiveis a uma ficha conhecida.
function comFicha(mock: jest.Mock, ficha: { id: string; paroquiaId: string }) {
  mock.mockImplementation(async ({ where }: any) => {
    if (where.id !== ficha.id) return null;
    const passa = where.OR
      ? where.OR.some(
          (c: any) => c.paroquiaId?.in?.includes(ficha.paroquiaId) || c.id?.in?.includes(ficha.id),
        )
      : where.paroquiaId === ficha.paroquiaId;
    return passa ? { id: ficha.id } : null;
  });
}

const vinculo = (fase: string) => ({
  id: 'i1',
  madrinhaId: 'madrinha',
  afilhadaId: 'afilhada',
  fase,
});

describe('pessoasElegiveis (exceções à R7 na implantação)', () => {
  it('sem vínculo: só a paróquia da montagem', async () => {
    const db = criarDb();
    db.implantacao.findFirst.mockResolvedValue(null);
    await expect(
      pessoasElegiveis(db as any, { paroquiaId: 'p1', implantacaoId: null }),
    ).resolves.toEqual({ paroquiaIds: ['p1'], liberadas: { fichaIds: [], fichaCasalIds: [] } });
    expect(db.implantacao.findFirst).toHaveBeenCalledWith({
      where: { afilhadaId: 'p1', fase: { in: ['IMPLANTACAO', 'ACOMPANHAMENTO'] } },
    });
  });

  it('IMPLANTACAO, encontro de anexo da afilhada: afilhada e madrinha', async () => {
    const db = criarDb();
    db.implantacao.findFirst.mockResolvedValue(vinculo('IMPLANTACAO'));
    const e = await pessoasElegiveis(db as any, { paroquiaId: 'afilhada', implantacaoId: 'i1' });
    expect(e.paroquiaIds).toEqual(['afilhada', 'madrinha']);
  });

  it('IMPLANTACAO, encontro da afilhada que não é de anexo: só a afilhada', async () => {
    const db = criarDb();
    db.implantacao.findFirst.mockResolvedValue(vinculo('IMPLANTACAO'));
    const e = await pessoasElegiveis(db as any, { paroquiaId: 'afilhada', implantacaoId: null });
    expect(e.paroquiaIds).toEqual(['afilhada']);
  });

  it('ACOMPANHAMENTO: a afilhada mais as fichas liberadas pela madrinha', async () => {
    const db = criarDb();
    db.implantacao.findFirst.mockResolvedValue(vinculo('ACOMPANHAMENTO'));
    db.liberacaoFicha.findMany.mockResolvedValue([
      { fichaId: 'f1', fichaCasalId: null },
      { fichaId: null, fichaCasalId: 'c1' },
    ]);
    await expect(
      pessoasElegiveis(db as any, { paroquiaId: 'afilhada', implantacaoId: 'i1' }),
    ).resolves.toEqual({
      paroquiaIds: ['afilhada'],
      liberadas: { fichaIds: ['f1'], fichaCasalIds: ['c1'] },
    });
  });

  it('filtroElegiveis mantém o filtro simples quando é só uma paróquia', () => {
    expect(
      filtroElegiveis(
        { paroquiaIds: ['p1'], liberadas: { fichaIds: [], fichaCasalIds: [] } },
        'fichaIds',
      ),
    ).toEqual({ paroquiaId: 'p1' });
    expect(
      filtroElegiveis(
        { paroquiaIds: ['a', 'm'], liberadas: { fichaIds: ['f1'], fichaCasalIds: [] } },
        'fichaIds',
      ),
    ).toEqual({ OR: [{ paroquiaId: { in: ['a', 'm'] } }, { id: { in: ['f1'] } }] });
  });
});

describe('garantirPessoaDaParoquia (alocação e lista de substituição)', () => {
  it('ficha da madrinha num encontro da afilhada que não é de anexo → 404', async () => {
    const db = criarDb();
    db.montagem.findUnique.mockResolvedValue({ paroquiaId: 'afilhada', implantacaoId: null });
    db.implantacao.findFirst.mockResolvedValue(vinculo('IMPLANTACAO'));
    comFicha(db.ficha.findFirst, { id: 'f-m', paroquiaId: 'madrinha' });
    await expect(garantirPessoaDaParoquia(db as any, 'm4', { fichaId: 'f-m' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('ficha da madrinha num encontro de anexo durante a IMPLANTACAO é aceita', async () => {
    const db = criarDb();
    db.montagem.findUnique.mockResolvedValue({ paroquiaId: 'afilhada', implantacaoId: 'i1' });
    db.implantacao.findFirst.mockResolvedValue(vinculo('IMPLANTACAO'));
    comFicha(db.ficha.findFirst, { id: 'f-m', paroquiaId: 'madrinha' });
    await expect(
      garantirPessoaDaParoquia(db as any, 'm1', { fichaId: 'f-m' }),
    ).resolves.toBeUndefined();
  });

  it('ficha liberada aceita no ACOMPANHAMENTO', async () => {
    const db = criarDb();
    db.montagem.findUnique.mockResolvedValue({ paroquiaId: 'afilhada', implantacaoId: null });
    db.implantacao.findFirst.mockResolvedValue(vinculo('ACOMPANHAMENTO'));
    db.liberacaoFicha.findMany.mockResolvedValue([{ fichaId: null, fichaCasalId: 'c-m' }]);
    comFicha(db.fichaCasal.findFirst, { id: 'c-m', paroquiaId: 'madrinha' });
    await expect(
      garantirPessoaDaParoquia(db as any, 'm5', { fichaCasalId: 'c-m' }),
    ).resolves.toBeUndefined();
  });

  it('depois de ENCERRADA, a ficha liberada volta a ser recusada', async () => {
    const db = criarDb();
    db.montagem.findUnique.mockResolvedValue({ paroquiaId: 'afilhada', implantacaoId: null });
    db.implantacao.findFirst.mockResolvedValue(null); // encerrada não entra na busca
    comFicha(db.fichaCasal.findFirst, { id: 'c-m', paroquiaId: 'madrinha' });
    await expect(
      garantirPessoaDaParoquia(db as any, 'm5', { fichaCasalId: 'c-m' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('ficha de uma terceira paróquia nunca entra', async () => {
    const db = criarDb();
    db.montagem.findUnique.mockResolvedValue({ paroquiaId: 'afilhada', implantacaoId: 'i1' });
    db.implantacao.findFirst.mockResolvedValue(vinculo('IMPLANTACAO'));
    comFicha(db.ficha.findFirst, { id: 'f-x', paroquiaId: 'outra' });
    await expect(garantirPessoaDaParoquia(db as any, 'm1', { fichaId: 'f-x' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
