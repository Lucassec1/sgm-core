// Anexos I, II e III da norma de implantação (docs/implantacao.md, Documento 01/CNS): vagas dos
// três encontros de implantação, por equipe, cargo e origem (madrinha/afilhada). A transcrição é
// conferida contra o RESUMO de cada anexo em anexos.spec.ts.
//
// Regras de transcrição:
// - "N jovens (x rapaz e y moça)" vira rapazes/moças; "N jovens" sem divisão vira `jovens`.
// - Eq. da Sala tem cargos próprios: um cargo citado pelo nome vai pra ele; "Componentes" é
//   distribuído pelos cargos não citados, na ordem do seed, com as quantidades do seed; o casal de
//   componentes vai pra Copilotos. "Todos da Paróquia Madrinha" (Anexo I) = todos os cargos da
//   Sala com origem madrinha.

export type OrigemAnexo = 'MADRINHA' | 'AFILHADA';

export interface LinhaAnexo {
  equipe: string;
  cargo: string;
  origem: OrigemAnexo;
  casais: number;
  rapazes: number;
  mocas: number;
  jovens: number;
}

const M: OrigemAnexo = 'MADRINHA';
const A: OrigemAnexo = 'AFILHADA';

function v(
  equipe: string,
  cargo: string,
  origem: OrigemAnexo,
  q: { c?: number; r?: number; m?: number; j?: number },
): LinhaAnexo {
  return {
    equipe,
    cargo,
    origem,
    casais: q.c ?? 0,
    rapazes: q.r ?? 0,
    mocas: q.m ?? 0,
    jovens: q.j ?? 0,
  };
}

const COMANDO_I_II: LinhaAnexo[] = [
  v('comando-geral', 'Comandantes Gerais', M, { c: 1 }),
  v('comando-geral', 'Comandantes Jovens', M, { r: 1, m: 1 }),
];

const ANEXO_I: LinhaAnexo[] = [
  ...COMANDO_I_II,
  v('espiritualizadora', 'Coordenação', M, { c: 1 }),
  v('espiritualizadora', 'Apoio', M, { j: 1 }),
  v('espiritualizadora', 'Apoio', A, { j: 1 }),
  v('animacao', 'Coordenação', M, { r: 1, m: 1 }),
  v('animacao', 'Apoio', M, { c: 1 }),
  v('animacao', 'Componentes', M, { j: 11 }),
  v('animacao', 'Componentes', A, { j: 1 }),
  v('canto', 'Coordenação', M, { r: 1, m: 1 }),
  v('canto', 'Apoio', M, { c: 1 }),
  v('canto', 'Componentes', M, { j: 7 }),
  v('canto', 'Componentes', A, { j: 1 }),
  v('circulos', 'Coordenação', M, { c: 1 }),
  v('circulos', 'Componentes', A, { c: 6, r: 6, m: 6 }),
  v('cozinha', 'Coordenação', M, { c: 1 }),
  v('cozinha', 'Apoio', M, { r: 1, m: 1 }),
  v('cozinha', 'Componentes', M, { c: 1, j: 5 }),
  v('cozinha', 'Componentes', A, { c: 2, j: 1 }),
  v('estacionamento', 'Coordenação', M, { r: 1, m: 1 }),
  v('estacionamento', 'Apoio', M, { c: 1 }),
  v('estacionamento', 'Componentes', M, { j: 6 }),
  v('estacionamento', 'Componentes', A, { c: 1 }),
  v('faxina', 'Coordenação', M, { r: 1, m: 1 }),
  v('faxina', 'Apoio', M, { c: 1 }),
  v('faxina', 'Componentes', M, { j: 8 }),
  v('faxina', 'Componentes', A, { c: 1 }),
  v('grafica', 'Coordenação', M, { r: 1, m: 1 }),
  v('grafica', 'Apoio', M, { c: 1 }),
  v('grafica', 'Componentes', M, { j: 5 }),
  v('grafica', 'Componentes', A, { c: 1, j: 1 }),
  v('lanche', 'Coordenação', M, { r: 1, m: 1 }),
  v('lanche', 'Apoio', M, { c: 1 }),
  v('lanche', 'Componentes', M, { j: 5 }),
  v('lanche', 'Componentes', A, { c: 1, j: 1 }),
  v('liturgia-e-vigilia', 'Coordenação', M, { r: 1, m: 1 }),
  v('liturgia-e-vigilia', 'Apoio', M, { c: 1 }),
  v('liturgia-e-vigilia', 'Componentes', M, { j: 11 }),
  v('liturgia-e-vigilia', 'Componentes', A, { c: 1, j: 1 }),
  v('minimercado', 'Coordenação', M, { r: 1, m: 1 }),
  v('minimercado', 'Apoio', M, { c: 1 }),
  v('minimercado', 'Componentes', M, { j: 3 }),
  v('minimercado', 'Componentes', A, { j: 1 }),
  v('prover', 'Coordenação', M, { c: 1 }),
  v('prover', 'Apoio', M, { j: 1 }),
  v('prover', 'Apoio', A, { j: 1 }),
  // "Todos da Paróquia Madrinha → 16 pessoas (12 jovens e 2 casais)": cargos do seed.
  v('sala', 'Coordenação', M, { c: 1 }),
  v('sala', 'Pilotos', M, { r: 1, m: 1 }),
  v('sala', 'Copilotos', M, { c: 1 }),
  v('sala', 'Aeromoça', M, { m: 2 }),
  v('sala', 'Comissários de bordo', M, { r: 2 }),
  v('sala', 'Controle de voo', M, { r: 1, m: 1 }),
  v('sala', 'Ligações', M, { r: 2, m: 2 }),
  // Documento: "02 jovens 7a) rapaz e 1 moça)" — 1 rapaz e 1 moça.
  v('vigilia-paroquial', 'Coordenação', M, { r: 1, m: 1 }),
  v('vigilia-paroquial', 'Apoio', M, { c: 1 }),
  v('vigilia-paroquial', 'Componentes', M, { j: 11 }),
  v('vigilia-paroquial', 'Componentes', A, { j: 1 }),
  v('visitacao', 'Coordenação', M, { c: 1 }),
  v('visitacao', 'Componentes', A, { c: 20 }),
];

const ANEXO_II: LinhaAnexo[] = [
  ...COMANDO_I_II,
  v('espiritualizadora', 'Coordenação', M, { c: 1 }),
  v('espiritualizadora', 'Apoio', A, { j: 2 }),
  v('animacao', 'Coordenação', M, { j: 1 }),
  v('animacao', 'Coordenação', A, { j: 1 }),
  v('animacao', 'Apoio', M, { c: 1 }),
  v('animacao', 'Componentes', M, { j: 4 }),
  v('animacao', 'Componentes', A, { j: 8 }),
  v('canto', 'Coordenação', M, { j: 1 }),
  v('canto', 'Coordenação', A, { j: 1 }),
  v('canto', 'Apoio', M, { c: 1 }),
  v('canto', 'Componentes', M, { j: 5 }),
  v('canto', 'Componentes', A, { j: 3 }),
  v('circulos', 'Coordenação', M, { c: 1 }),
  v('circulos', 'Componentes', A, { c: 6, r: 6, m: 6 }),
  v('cozinha', 'Coordenação', M, { c: 1 }),
  v('cozinha', 'Apoio', M, { r: 1, m: 1 }),
  v('cozinha', 'Componentes', M, { c: 1 }),
  v('cozinha', 'Componentes', A, { c: 2, j: 6 }),
  v('estacionamento', 'Coordenação', M, { r: 1, m: 1 }),
  v('estacionamento', 'Apoio', M, { c: 1 }),
  v('estacionamento', 'Componentes', M, { j: 2 }),
  v('estacionamento', 'Componentes', A, { c: 1, j: 4 }),
  // Documento: "02 jovens 7a) rapaz e 1 moça)" — 1 rapaz e 1 moça.
  v('faxina', 'Coordenação', M, { r: 1, m: 1 }),
  v('faxina', 'Apoio', M, { c: 1 }),
  v('faxina', 'Componentes', M, { j: 2 }),
  v('faxina', 'Componentes', A, { c: 1, j: 6 }),
  v('grafica', 'Coordenação', M, { j: 1 }),
  v('grafica', 'Coordenação', A, { j: 1 }),
  v('grafica', 'Apoio', M, { c: 1 }),
  v('grafica', 'Componentes', M, { j: 3 }),
  v('grafica', 'Componentes', A, { c: 1, j: 3 }),
  v('lanche', 'Coordenação', M, { j: 1 }),
  v('lanche', 'Coordenação', A, { j: 1 }),
  v('lanche', 'Apoio', M, { c: 1 }),
  v('lanche', 'Componentes', M, { j: 3 }),
  v('lanche', 'Componentes', A, { c: 1, j: 3 }),
  v('liturgia-e-vigilia', 'Coordenação', M, { j: 1 }),
  v('liturgia-e-vigilia', 'Coordenação', A, { j: 1 }),
  v('liturgia-e-vigilia', 'Apoio', M, { c: 1 }),
  v('liturgia-e-vigilia', 'Componentes', M, { j: 3 }),
  v('liturgia-e-vigilia', 'Componentes', A, { c: 1, j: 9 }),
  v('minimercado', 'Coordenação', M, { j: 1 }),
  v('minimercado', 'Coordenação', A, { j: 1 }),
  v('minimercado', 'Apoio', M, { c: 1 }),
  v('minimercado', 'Componentes', M, { j: 2 }),
  v('minimercado', 'Componentes', A, { j: 2 }),
  v('prover', 'Coordenação', M, { c: 1 }),
  v('prover', 'Apoio', A, { j: 2 }),
  // Componentes madrinha 10 jovens; afilhada 1 casal (copiloto) e 2 jovens (primeiro cargo não
  // citado no seed: Pilotos).
  v('sala', 'Coordenação', M, { c: 1 }),
  v('sala', 'Pilotos', A, { r: 1, m: 1 }),
  v('sala', 'Copilotos', A, { c: 1 }),
  v('sala', 'Aeromoça', M, { m: 2 }),
  v('sala', 'Comissários de bordo', M, { r: 2 }),
  v('sala', 'Controle de voo', M, { r: 1, m: 1 }),
  v('sala', 'Ligações', M, { r: 2, m: 2 }),
  v('vigilia-paroquial', 'Coordenação', M, { j: 1 }),
  v('vigilia-paroquial', 'Coordenação', A, { j: 1 }),
  v('vigilia-paroquial', 'Apoio', M, { c: 1 }),
  v('vigilia-paroquial', 'Componentes', M, { j: 3 }),
  v('vigilia-paroquial', 'Componentes', A, { j: 9 }),
  v('visitacao', 'Coordenação', M, { c: 1 }),
  v('visitacao', 'Componentes', A, { c: 20 }),
];

const ANEXO_III: LinhaAnexo[] = [
  v('comando-geral', 'Comandantes Gerais', A, { c: 1 }),
  v('comando-geral', 'Comandantes Jovens', A, { r: 1, m: 1 }),
  v('espiritualizadora', 'Coordenação', A, { c: 1 }),
  v('espiritualizadora', 'Apoio', A, { j: 2 }),
  v('animacao', 'Coordenação', A, { r: 1, m: 1 }),
  v('animacao', 'Apoio', A, { c: 1 }),
  v('animacao', 'Componentes', M, { j: 4 }),
  v('animacao', 'Componentes', A, { j: 8 }),
  v('canto', 'Coordenação', A, { r: 1, m: 1 }),
  v('canto', 'Apoio', A, { c: 1 }),
  v('canto', 'Componentes', M, { j: 4 }),
  v('canto', 'Componentes', A, { j: 4 }),
  v('circulos', 'Coordenação', A, { c: 1 }),
  v('circulos', 'Componentes', A, { c: 6, r: 6, m: 6 }),
  v('cozinha', 'Coordenação', A, { c: 1 }),
  v('cozinha', 'Apoio', A, { r: 1, m: 1 }),
  v('cozinha', 'Componentes', M, { c: 1 }),
  v('cozinha', 'Componentes', A, { c: 2, j: 6 }),
  v('estacionamento', 'Coordenação', A, { r: 1, m: 1 }),
  v('estacionamento', 'Apoio', A, { c: 1 }),
  v('estacionamento', 'Componentes', M, { j: 2 }),
  v('estacionamento', 'Componentes', A, { c: 1, j: 4 }),
  // Documento: "02 jovens (a) rapaz e 1 moça)" — 1 rapaz e 1 moça.
  v('faxina', 'Coordenação', A, { r: 1, m: 1 }),
  v('faxina', 'Apoio', A, { c: 1 }),
  v('faxina', 'Componentes', M, { j: 2 }),
  v('faxina', 'Componentes', A, { c: 1, j: 6 }),
  v('grafica', 'Coordenação', A, { r: 1, m: 1 }),
  v('grafica', 'Apoio', A, { c: 1 }),
  v('grafica', 'Componentes', M, { j: 2 }),
  v('grafica', 'Componentes', A, { c: 1, j: 4 }),
  v('lanche', 'Coordenação', A, { r: 1, m: 1 }),
  v('lanche', 'Apoio', A, { c: 1 }),
  v('lanche', 'Componentes', M, { j: 2 }),
  v('lanche', 'Componentes', A, { c: 1, j: 4 }),
  v('liturgia-e-vigilia', 'Coordenação', A, { r: 1, m: 1 }),
  v('liturgia-e-vigilia', 'Apoio', A, { c: 1 }),
  v('liturgia-e-vigilia', 'Componentes', M, { j: 2 }),
  v('liturgia-e-vigilia', 'Componentes', A, { c: 1, j: 10 }),
  v('minimercado', 'Coordenação', A, { r: 1, m: 1 }),
  v('minimercado', 'Apoio', A, { c: 1 }),
  v('minimercado', 'Componentes', M, { j: 1 }),
  v('minimercado', 'Componentes', A, { j: 3 }),
  v('prover', 'Coordenação', A, { c: 1 }),
  v('prover', 'Apoio', A, { j: 2 }),
  // Sala detalhada por cargo no próprio anexo.
  v('sala', 'Coordenação', A, { c: 1 }),
  v('sala', 'Pilotos', M, { r: 1, m: 1 }),
  v('sala', 'Copilotos', A, { c: 1 }),
  v('sala', 'Aeromoça', M, { m: 1 }),
  v('sala', 'Aeromoça', A, { m: 1 }),
  v('sala', 'Comissários de bordo', M, { r: 1 }),
  v('sala', 'Comissários de bordo', A, { r: 1 }),
  v('sala', 'Controle de voo', M, { j: 1 }),
  v('sala', 'Controle de voo', A, { j: 1 }),
  v('sala', 'Ligações', M, { r: 1, m: 1 }),
  v('sala', 'Ligações', A, { r: 1, m: 1 }),
  v('vigilia-paroquial', 'Coordenação', A, { r: 1, m: 1 }),
  v('vigilia-paroquial', 'Apoio', A, { c: 1 }),
  v('vigilia-paroquial', 'Componentes', M, { j: 2 }),
  v('vigilia-paroquial', 'Componentes', A, { j: 10 }),
  v('visitacao', 'Coordenação', A, { c: 1 }),
  v('visitacao', 'Componentes', A, { c: 20 }),
];

export const ANEXOS: Record<1 | 2 | 3, LinhaAnexo[]> = { 1: ANEXO_I, 2: ANEXO_II, 3: ANEXO_III };
