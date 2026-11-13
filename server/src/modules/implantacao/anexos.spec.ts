import * as path from 'path';
import { ANEXOS, LinhaAnexo } from './anexos';

// Números do RESUMO de cada anexo em docs/implantacao.md — a transcrição tem que bater com eles.
const RESUMO = {
  1: { MADRINHA: { jovens: 108, casais: 18 }, AFILHADA: { jovens: 22, casais: 33 } },
  2: { MADRINHA: { jovens: 52, casais: 17 }, AFILHADA: { jovens: 78, casais: 34 } },
  3: { MADRINHA: { jovens: 28, casais: 1 }, AFILHADA: { jovens: 102, casais: 50 } },
} as const;

// "(N pessoas)" do cabeçalho de cada equipe nos anexos (Comando Geral = gerais 2 + jovens 2).
const PESSOAS_POR_EQUIPE: Record<string, number> = {
  'comando-geral': 4,
  espiritualizadora: 4,
  animacao: 16,
  canto: 12,
  circulos: 26,
  cozinha: 16,
  estacionamento: 12,
  faxina: 14,
  grafica: 12,
  lanche: 12,
  'liturgia-e-vigilia': 18,
  minimercado: 8,
  prover: 4,
  sala: 16,
  'vigilia-paroquial': 16,
  visitacao: 42,
};

// O seed fica fora do rootDir do tsconfig — require dinâmico só no teste.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EQUIPES } = require(path.join(__dirname, '../../../prisma/seed-equipes')) as {
  EQUIPES: { slug: string; cargos: { nome: string }[] }[];
};

const jovens = (l: LinhaAnexo) => l.rapazes + l.mocas + l.jovens;
const pessoas = (l: LinhaAnexo) => l.casais * 2 + jovens(l);

describe('ANEXOS (norma de implantação, Anexos I–III)', () => {
  it.each([1, 2, 3] as const)('anexo %i bate com o RESUMO por origem', (n) => {
    for (const origem of ['MADRINHA', 'AFILHADA'] as const) {
      const linhas = ANEXOS[n].filter((l) => l.origem === origem);
      expect({
        jovens: linhas.reduce((s, l) => s + jovens(l), 0),
        casais: linhas.reduce((s, l) => s + l.casais, 0),
      }).toEqual(RESUMO[n][origem]);
    }
  });

  it.each([1, 2, 3] as const)('anexo %i: pessoas por equipe e total de 232', (n) => {
    const porEquipe: Record<string, number> = {};
    for (const l of ANEXOS[n]) porEquipe[l.equipe] = (porEquipe[l.equipe] ?? 0) + pessoas(l);
    expect(porEquipe).toEqual(PESSOAS_POR_EQUIPE);
    expect(ANEXOS[n].reduce((s, l) => s + pessoas(l), 0)).toBe(232);
  });

  it('toda linha aponta pra equipe e cargo existentes', () => {
    for (const n of [1, 2, 3] as const) {
      for (const l of ANEXOS[n]) {
        const equipe = EQUIPES.find((e) => e.slug === l.equipe);
        expect({ n, l, existe: !!equipe?.cargos.some((c) => c.nome === l.cargo) }).toEqual({
          n,
          l,
          existe: true,
        });
      }
    }
  });
});
