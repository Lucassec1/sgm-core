import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../offline-status', () => ({
  markServedFresh: vi.fn(),
  markServedFromCache: vi.fn(),
}));

import { markServedFresh, markServedFromCache } from '../offline-status';
import { ApiError, buildQuery, request } from './request';

function respostaFake(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispara sgm:atuacao-encerrada no 409 ATUACAO_ENCERRADA (fase da implantação mudou)', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          respostaFake(409, { code: 'ATUACAO_ENCERRADA', message: 'A atuação terminou' }),
        ),
    );
    const ouvinte = vi.fn();
    window.addEventListener('sgm:atuacao-encerrada', ouvinte);
    await request('/fichas', { method: 'POST' }).catch(() => undefined);
    window.removeEventListener('sgm:atuacao-encerrada', ouvinte);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('dispara sgm:sessao-expirada quando a API responde 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaFake(401, { message: 'Unauthorized' })),
    );
    const ouvinte = vi.fn();
    window.addEventListener('sgm:sessao-expirada', ouvinte);

    const erro = await request('/auth/me').catch((e: unknown) => e);

    window.removeEventListener('sgm:sessao-expirada', ouvinte);
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(401);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('marca resposta vinda do cache (x-from-cache) e limpa o aviso nas demais', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaFake(200, { ok: 1 }, { 'x-from-cache': 'true' }))
      .mockResolvedValueOnce(respostaFake(200, { ok: 2 }));
    vi.stubGlobal('fetch', fetchMock);

    await request('/montagens/m1');
    expect(markServedFromCache).toHaveBeenCalledTimes(1);
    expect(markServedFresh).not.toHaveBeenCalled();

    await request('/fichas');
    expect(markServedFresh).toHaveBeenCalledTimes(1);
  });
});

describe('buildQuery', () => {
  it('ignora undefined e string vazia', () => {
    expect(buildQuery({ a: 1, b: undefined, c: '', e: 'x' })).toBe('a=1&e=x');
  });
});
