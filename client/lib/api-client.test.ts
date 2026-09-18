import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./offline-status', () => ({
  markServedFresh: vi.fn(),
  markServedFromCache: vi.fn(),
}));

import { markServedFresh, markServedFromCache } from './offline-status';
import { apiClient, ApiError } from './api-client';

function respostaFake(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: { get: (nome: string) => init.headers?.[nome] ?? null },
    json: () => Promise.resolve(body),
  };
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('login', () => {
    it('faz POST com credentials include e body certo', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({
          id: '1',
          login: 'paroquia-dev',
          role: 'PAROQUIA',
          nome: null,
          paroquia: null,
        }),
      );

      await apiClient.login('paroquia-dev', 'senha123');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ login: 'paroquia-dev', senha: 'senha123' }),
        }),
      );
    });
  });

  describe('listFichas', () => {
    it('faz GET com a query string montada a partir dos params', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respostaFake({ items: [], total: 0 }));

      await apiClient.listFichas({ nome: 'Ana', pageSize: 20 });

      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/fichas?');
      expect(url).toContain('nome=Ana');
      expect(url).toContain('pageSize=20');
      expect(options).toEqual(expect.objectContaining({ credentials: 'include' }));
    });
  });

  describe('me', () => {
    it('faz GET simples em /auth/me', async () => {
      const sessao = { id: '1', login: 'x', role: 'PAROQUIA', nome: null, paroquia: null };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respostaFake(sessao));

      await expect(apiClient.me()).resolves.toEqual(sessao);
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/auth/me', expect.any(Object));
    });
  });

  describe('deleteFicha', () => {
    it('devolve undefined numa resposta 204, sem tentar parsear JSON', async () => {
      const json = vi.fn();
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 204,
        headers: { get: () => null },
        json,
      });

      await expect(apiClient.deleteFicha('id-1')).resolves.toBeUndefined();
      expect(json).not.toHaveBeenCalled();
    });
  });

  describe('erro', () => {
    it('lança ApiError com a mensagem do body e o status certo', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({ message: 'Ficha não encontrada' }, { status: 404 }),
      );

      await expect(apiClient.getFicha('id-x')).rejects.toMatchObject({
        message: 'Ficha não encontrada',
        status: 404,
      });
    });

    it('junta mensagens em array com vírgula (erro de validação do class-validator)', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({ message: ['campo A inválido', 'campo B inválido'] }, { status: 400 }),
      );

      await expect(apiClient.getFicha('id-x')).rejects.toMatchObject({
        message: 'campo A inválido, campo B inválido',
      });
    });

    it('dispara sgm:sessao-expirada em 401', async () => {
      const ouvinte = vi.fn();
      window.addEventListener('sgm:sessao-expirada', ouvinte);

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({ message: 'Unauthorized' }, { status: 401 }),
      );

      await expect(apiClient.me()).rejects.toBeInstanceOf(ApiError);
      expect(ouvinte).toHaveBeenCalledTimes(1);

      window.removeEventListener('sgm:sessao-expirada', ouvinte);
    });

    it('não dispara sgm:sessao-expirada em erro que não é 401', async () => {
      const ouvinte = vi.fn();
      window.addEventListener('sgm:sessao-expirada', ouvinte);

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({ message: 'erro' }, { status: 500 }),
      );

      await expect(apiClient.me()).rejects.toBeInstanceOf(ApiError);
      expect(ouvinte).not.toHaveBeenCalled();

      window.removeEventListener('sgm:sessao-expirada', ouvinte);
    });
  });

  describe('sinal de cache (proposta #6)', () => {
    it('chama markServedFromCache quando a resposta tem o header x-from-cache', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({ id: '1' }, { headers: { 'x-from-cache': '1' } }),
      );

      await apiClient.getMontagem('m1');

      expect(markServedFromCache).toHaveBeenCalled();
      expect(markServedFresh).not.toHaveBeenCalled();
    });

    it('chama markServedFresh quando a resposta não tem o header', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respostaFake({ id: '1' }));

      await apiClient.getMontagem('m1');

      expect(markServedFresh).toHaveBeenCalled();
      expect(markServedFromCache).not.toHaveBeenCalled();
    });
  });
});
