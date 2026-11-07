import { describe, expect, it } from 'vitest';
import type { Alocacao, VagaMontagem } from './types';
import { resumoEquipe } from './montagem';

const vaga = (q: Partial<VagaMontagem>) =>
  ({ quantidadeCasais: 0, quantidadeRapazes: 0, quantidadeMocas: 0, ...q }) as VagaMontagem;
const aloc = (status: string) => ({ status }) as Alocacao;

describe('resumoEquipe', () => {
  it('conta vagas, preenchidas (rascunho/convidado/aceito) e aceitas', () => {
    const r = resumoEquipe(
      [vaga({ quantidadeRapazes: 2, quantidadeMocas: 1 }), vaga({ quantidadeCasais: 1 })],
      [aloc('RASCUNHO'), aloc('CONVIDADO'), aloc('ACEITO'), aloc('RECUSADO')],
    );
    expect(r).toEqual({ totalVagas: 4, preenchidas: 3, aceitas: 1, fechada: false });
  });

  it('só fecha quando todas as vagas têm alguém que aceitou', () => {
    const vagas = [vaga({ quantidadeRapazes: 1, quantidadeMocas: 1 })];
    expect(resumoEquipe(vagas, [aloc('ACEITO'), aloc('CONVIDADO')]).fechada).toBe(false);
    expect(resumoEquipe(vagas, [aloc('ACEITO'), aloc('ACEITO')]).fechada).toBe(true);
  });

  it('equipe sem vagas nunca conta como fechada', () => {
    expect(resumoEquipe([], []).fechada).toBe(false);
  });
});
