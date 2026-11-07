import { describe, expect, it } from 'vitest';
import { cn, iniciais, nullsToUndefined } from './utils';

describe('cn', () => {
  it('junta classes e resolve conflito do Tailwind (última vence)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', false && 'hidden', 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('nullsToUndefined', () => {
  it('troca null por undefined e preserva o resto', () => {
    const entrada = { nome: 'João', email: null, telefone: '99999', ativo: false, encontro: 0 };

    expect(nullsToUndefined(entrada)).toEqual({
      nome: 'João',
      email: undefined,
      telefone: '99999',
      ativo: false,
      encontro: 0,
    });
  });

  it('não confunde 0 nem string vazia com null', () => {
    expect(nullsToUndefined({ a: 0, b: '', c: null })).toEqual({ a: 0, b: '', c: undefined });
  });
});

describe('iniciais', () => {
  it('pessoa: primeira letra do primeiro e do último nome', () => {
    expect(iniciais('Beatriz Almeida Santos')).toBe('BS');
    expect(iniciais('  maria  ')).toBe('M');
  });

  it('casal: uma letra de cada nome (só o primeiro nome de cada)', () => {
    expect(iniciais('Gabriel Araújo', 'Yasmin Nascimento Silva')).toBe('GY');
  });

  it('nome vazio vira string vazia (o avatar mostra ícone)', () => {
    expect(iniciais('')).toBe('');
  });
});
