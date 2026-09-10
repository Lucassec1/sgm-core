import { describe, expect, it } from 'vitest';
import { cn, nullsToUndefined } from './utils';

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
