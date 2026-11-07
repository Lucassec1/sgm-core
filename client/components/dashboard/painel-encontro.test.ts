import { describe, expect, it } from 'vitest';
import { proximoPasso } from './painel-encontro';

const eq = (nome: string, totalVagas: number, aceitas: number, ehCirculos = false) => ({
  equipe: { nome, ehCirculos },
  totalVagas,
  aceitas,
  preenchidas: aceitas,
  fechada: totalVagas > 0 && aceitas >= totalVagas,
});

describe('proximoPasso', () => {
  it('R4: enquanto os Círculos não fecham, o próximo passo é fechá-los', () => {
    const passo = proximoPasso([
      eq('Equipe dos Círculos', 19, 8, true),
      eq('Equipe do Canto', 11, 0),
    ]);
    expect(passo).toBe(
      'Feche primeiro a Equipe dos Círculos: 8 de 19 aceitaram. As outras equipes só devem ser convidadas depois (R4).',
    );
  });

  it('com os Círculos fechados, aponta a equipe com mais vagas em aberto', () => {
    const passo = proximoPasso([
      eq('Equipe dos Círculos', 19, 19, true),
      eq('Equipe do Canto', 11, 10),
      eq('Equipe da Sala', 14, 2),
    ]);
    expect(passo).toBe('Faltam 2 equipes. A que tem mais vagas em aberto é a Equipe da Sala (12).');
  });

  it('com tudo fechado, manda conferir e finalizar', () => {
    expect(proximoPasso([eq('Equipe dos Círculos', 19, 19, true)])).toBe(
      'Todas as equipes fecharam. Confira a lista completa e finalize a montagem.',
    );
  });
});
