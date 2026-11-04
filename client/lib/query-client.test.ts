import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client';
import { criarQueryClient, deveRepetir } from './query-client';

describe('deveRepetir', () => {
  it('não repete erro 4xx da API', () => {
    for (const status of [400, 401, 403, 404, 409]) {
      expect(deveRepetir(0, new ApiError('x', status, null))).toBe(false);
    }
  });

  it('repete 5xx e falha de rede no máximo 2 vezes', () => {
    const erro500 = new ApiError('x', 500, null);
    const erroRede = new TypeError('Failed to fetch');
    expect(deveRepetir(0, erro500)).toBe(true);
    expect(deveRepetir(1, erroRede)).toBe(true);
    expect(deveRepetir(2, erro500)).toBe(false);
  });
});

describe('criarQueryClient', () => {
  it('aplica retry e staleTime padrão nas queries', () => {
    const opcoes = criarQueryClient().getDefaultOptions().queries;
    expect(opcoes?.retry).toBe(deveRepetir);
    expect(opcoes?.staleTime).toBe(30_000);
  });
});
