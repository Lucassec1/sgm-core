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

  describe('endpoints simples', () => {
    const casos: [string, () => Promise<unknown>, { method: string; path: string }][] = [
      ['logout', () => apiClient.logout(), { method: 'POST', path: '/auth/logout' }],
      [
        'alterarSenha',
        () => apiClient.alterarSenha('atual', 'nova'),
        { method: 'PATCH', path: '/auth/senha' },
      ],
      ['getFicha', () => apiClient.getFicha('f1'), { method: 'GET', path: '/fichas/f1' }],
      [
        'createFicha',
        () => apiClient.createFicha({ nomeCompleto: 'Ana' }),
        { method: 'POST', path: '/fichas' },
      ],
      [
        'updateFicha',
        () => apiClient.updateFicha('f1', { nomeCompleto: 'Ana' }),
        { method: 'PATCH', path: '/fichas/f1' },
      ],
      ['deleteFicha', () => apiClient.deleteFicha('f1'), { method: 'DELETE', path: '/fichas/f1' }],
      [
        'historicoEquipesFicha',
        () => apiClient.historicoEquipesFicha('f1'),
        { method: 'GET', path: '/fichas/f1/historico-equipes' },
      ],
      [
        'removerFotoFicha',
        () => apiClient.removerFotoFicha('f1'),
        { method: 'DELETE', path: '/fichas/f1/foto' },
      ],
      [
        'listEncontros',
        () => apiClient.listEncontros(),
        { method: 'GET', path: '/fichas/encontros' },
      ],
      [
        'listFichasCasais',
        () => apiClient.listFichasCasais({}),
        { method: 'GET', path: '/fichas-casais?' },
      ],
      [
        'getFichaCasal',
        () => apiClient.getFichaCasal('c1'),
        { method: 'GET', path: '/fichas-casais/c1' },
      ],
      [
        'createFichaCasal',
        () => apiClient.createFichaCasal({}),
        { method: 'POST', path: '/fichas-casais' },
      ],
      [
        'updateFichaCasal',
        () => apiClient.updateFichaCasal('c1', {}),
        { method: 'PATCH', path: '/fichas-casais/c1' },
      ],
      [
        'deleteFichaCasal',
        () => apiClient.deleteFichaCasal('c1'),
        { method: 'DELETE', path: '/fichas-casais/c1' },
      ],
      [
        'historicoEquipesFichaCasal',
        () => apiClient.historicoEquipesFichaCasal('c1'),
        { method: 'GET', path: '/fichas-casais/c1/historico-equipes' },
      ],
      [
        'removerFotoFichaCasal',
        () => apiClient.removerFotoFichaCasal('c1'),
        { method: 'DELETE', path: '/fichas-casais/c1/foto' },
      ],
      ['listEquipes', () => apiClient.listEquipes(), { method: 'GET', path: '/equipes' }],
      ['listMontagens', () => apiClient.listMontagens({}), { method: 'GET', path: '/montagens?' }],
      ['getMontagem', () => apiClient.getMontagem('m1'), { method: 'GET', path: '/montagens/m1' }],
      [
        'createMontagem',
        () => apiClient.createMontagem({}),
        { method: 'POST', path: '/montagens' },
      ],
      [
        'updateMontagem',
        () => apiClient.updateMontagem('m1', {}),
        { method: 'PATCH', path: '/montagens/m1' },
      ],
      [
        'listAlocacoes',
        () => apiClient.listAlocacoes('m1'),
        { method: 'GET', path: '/montagens/m1/alocacoes' },
      ],
      [
        'createAlocacao',
        () => apiClient.createAlocacao('m1', { vagaMontagemId: 'v1', tipoPessoa: 'JOVEM' }),
        { method: 'POST', path: '/montagens/m1/alocacoes' },
      ],
      [
        'deleteAlocacao',
        () => apiClient.deleteAlocacao('m1', 'a1'),
        { method: 'DELETE', path: '/montagens/m1/alocacoes/a1' },
      ],
      [
        'updateAlocacao',
        () => apiClient.updateAlocacao('m1', 'a1', { status: 'ACEITO' }),
        { method: 'PATCH', path: '/montagens/m1/alocacoes/a1' },
      ],
      [
        'listCandidatosJovens',
        () => apiClient.listCandidatosJovens('m1'),
        { method: 'GET', path: '/montagens/m1/candidatos-jovens?' },
      ],
      [
        'coordenadoresSugeridos',
        () => apiClient.coordenadoresSugeridos('m1', 'e1'),
        { method: 'GET', path: '/montagens/m1/equipes/e1/coordenadores-sugeridos' },
      ],
      [
        'listListaSubstituicao',
        () => apiClient.listListaSubstituicao('m1'),
        { method: 'GET', path: '/montagens/m1/lista-substituicao' },
      ],
      [
        'createListaSubstituicaoItem',
        () => apiClient.createListaSubstituicaoItem('m1', { tipoPessoa: 'JOVEM' }),
        { method: 'POST', path: '/montagens/m1/lista-substituicao' },
      ],
      [
        'deleteListaSubstituicaoItem',
        () => apiClient.deleteListaSubstituicaoItem('m1', 'i1'),
        { method: 'DELETE', path: '/montagens/m1/lista-substituicao/i1' },
      ],
      ['listLog', () => apiClient.listLog('m1'), { method: 'GET', path: '/montagens/m1/log' }],
      [
        'resumoMontagem',
        () => apiClient.resumoMontagem('m1'),
        { method: 'GET', path: '/montagens/m1/resumo' },
      ],
      [
        'listQuadrantes',
        () => apiClient.listQuadrantes('m1'),
        { method: 'GET', path: '/montagens/m1/quadrantes' },
      ],
      [
        'deleteQuadrante',
        () => apiClient.deleteQuadrante('m1', 'q1'),
        { method: 'DELETE', path: '/montagens/m1/quadrantes/q1' },
      ],
      [
        'getTelaoMontagem',
        () => apiClient.getTelaoMontagem('m1'),
        { method: 'GET', path: '/telao/montagens/m1' },
      ],
      ['listParoquias', () => apiClient.listParoquias(), { method: 'GET', path: '/paroquias' }],
      [
        'createParoquia',
        () => apiClient.createParoquia({ nome: 'Sé', login: 'se', senha: '123' }),
        { method: 'POST', path: '/paroquias' },
      ],
      [
        'resetCredenciaisParoquia',
        () => apiClient.resetCredenciaisParoquia('p1', 'nova'),
        { method: 'PATCH', path: '/paroquias/p1/credenciais' },
      ],
      [
        'conselhoListMontagens',
        () => apiClient.conselhoListMontagens(),
        { method: 'GET', path: '/conselho/montagens?' },
      ],
      [
        'conselhoGetMontagem',
        () => apiClient.conselhoGetMontagem('m1'),
        { method: 'GET', path: '/conselho/montagens/m1' },
      ],
      [
        'conselhoListObservacoes',
        () => apiClient.conselhoListObservacoes('m1'),
        { method: 'GET', path: '/conselho/montagens/m1/observacoes' },
      ],
      [
        'conselhoCriarObservacao',
        () => apiClient.conselhoCriarObservacao('m1', 'texto'),
        { method: 'POST', path: '/conselho/montagens/m1/observacoes' },
      ],
    ];

    it.each(casos)('%s chama a rota e o método certos', async (_nome, chamada, esperado) => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respostaFake({}));

      await chamada();

      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(esperado.path);
      expect((options as RequestInit).method ?? 'GET').toBe(esperado.method);
    });
  });

  describe('buildQuery', () => {
    it('omite params undefined e string vazia da query string', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respostaFake([]));

      await apiClient.listCandidatosJovens('m1', undefined);

      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).not.toContain('vagaMontagemId');

      (fetch as ReturnType<typeof vi.fn>).mockClear();
      await apiClient.listFichas({ nome: '', pageSize: 10 });
      const [url2] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url2).not.toContain('nome=');
      expect(url2).toContain('pageSize=10');
    });
  });

  describe('URLs de download/export', () => {
    it('monta as urls diretas sem chamar fetch', () => {
      expect(apiClient.quadranteDownloadUrl('m1', 'q1')).toBe(
        'http://localhost:3001/montagens/m1/quadrantes/q1/download',
      );
      expect(apiClient.exportFichasUrl()).toBe('http://localhost:3001/fichas/export');
      expect(apiClient.exportFichasCasaisUrl()).toBe('http://localhost:3001/fichas-casais/export');
      expect(apiClient.exportMontagemUrl('m1')).toBe('http://localhost:3001/montagens/m1/export');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('uploads multipart', () => {
    it('uploadFotoFicha envia FormData sem Content-Type manual e devolve a ficha', async () => {
      const ficha = { id: 'f1', nomeCompleto: 'Ana' };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respostaFake(ficha));
      const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });

      const resultado = await apiClient.uploadFotoFicha('f1', file);

      expect(resultado).toEqual(ficha);
      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://localhost:3001/fichas/f1/foto');
      expect((options as RequestInit).body).toBeInstanceOf(FormData);
      expect((options as RequestInit).headers).toBeUndefined();
    });

    it('uploadFotoFicha lança ApiError quando a resposta falha', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({ message: 'arquivo inválido' }, { status: 400 }),
      );
      const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });

      await expect(apiClient.uploadFotoFicha('f1', file)).rejects.toMatchObject({
        message: 'arquivo inválido',
        status: 400,
      });
    });

    it('uploadFotoFichaCasal envia FormData e devolve a ficha do casal', async () => {
      const fichaCasal = { id: 'c1' };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respostaFake(fichaCasal));
      const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });

      const resultado = await apiClient.uploadFotoFichaCasal('c1', file);

      expect(resultado).toEqual(fichaCasal);
      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://localhost:3001/fichas-casais/c1/foto');
    });

    it('uploadFotoFichaCasal lança ApiError quando a resposta falha', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({ message: 'arquivo inválido' }, { status: 400 }),
      );
      const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });

      await expect(apiClient.uploadFotoFichaCasal('c1', file)).rejects.toBeInstanceOf(ApiError);
    });

    it('uploadQuadrante inclui usuario no FormData quando informado', async () => {
      const arquivo = { id: 'q1' };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respostaFake(arquivo));
      const file = new File(['pdf'], 'quadrante.pdf', { type: 'application/pdf' });

      const resultado = await apiClient.uploadQuadrante('m1', file, 'paróquia-sé');

      expect(resultado).toEqual(arquivo);
      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://localhost:3001/montagens/m1/quadrantes');
      const form = (options as RequestInit).body as FormData;
      expect(form.get('usuario')).toBe('paróquia-sé');
    });

    it('uploadQuadrante lança ApiError quando a resposta falha', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        respostaFake({ message: 'arquivo inválido' }, { status: 400 }),
      );
      const file = new File(['pdf'], 'quadrante.pdf', { type: 'application/pdf' });

      await expect(apiClient.uploadQuadrante('m1', file)).rejects.toMatchObject({
        message: 'arquivo inválido',
      });
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
