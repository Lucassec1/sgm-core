import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('../api-client', () => ({
  apiClient: {
    listFichasCasais: vi.fn(),
    getFichaCasal: vi.fn(),
    createFichaCasal: vi.fn(),
    updateFichaCasal: vi.fn(),
    historicoEquipesFichaCasal: vi.fn(),
    uploadFotoFichaCasal: vi.fn(),
    removerFotoFichaCasal: vi.fn(),
  },
}));

import { apiClient } from '../api-client';
import {
  useFichasCasais,
  useFichaCasal,
  useCreateFichaCasal,
  useUpdateFichaCasal,
  useHistoricoEquipesCasal,
  useUploadFotoFichaCasal,
  useRemoverFotoFichaCasal,
} from './use-fichas-casais';

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useFichasCasais', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca fichas de casal com os params certos', async () => {
    const resposta = { items: [{ id: 'c1' }], total: 1 };
    (apiClient.listFichasCasais as ReturnType<typeof vi.fn>).mockResolvedValue(resposta);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useFichasCasais({ nome: 'Ana' }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(resposta);
    expect(apiClient.listFichasCasais).toHaveBeenCalledWith({ nome: 'Ana' });
  });

  it('não busca quando enabled é false', () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useFichasCasais({}, { enabled: false }), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(apiClient.listFichasCasais).not.toHaveBeenCalled();
  });
});

describe('useFichaCasal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca a ficha de casal pelo id quando informado', async () => {
    (apiClient.getFichaCasal as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1' });
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useFichaCasal('c1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.getFichaCasal).toHaveBeenCalledWith('c1');
  });

  it('não busca quando o id é undefined', () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useFichaCasal(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateFichaCasal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalida a lista depois de criar com sucesso', async () => {
    (apiClient.createFichaCasal as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateFichaCasal(), { wrapper: Wrapper });
    result.current.mutate({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas-casais'] });
  });
});

describe('useUpdateFichaCasal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalida a lista e a ficha específica depois de atualizar', async () => {
    (apiClient.updateFichaCasal as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateFichaCasal('c1'), { wrapper: Wrapper });
    result.current.mutate({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas-casais'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas-casais', 'c1'] });
  });
});

describe('useHistoricoEquipesCasal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca o histórico quando há fichaCasalId', async () => {
    (apiClient.historicoEquipesFichaCasal as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useHistoricoEquipesCasal('c1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.historicoEquipesFichaCasal).toHaveBeenCalledWith('c1');
  });

  it('não busca quando fichaCasalId é undefined', () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useHistoricoEquipesCasal(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useUploadFotoFichaCasal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o arquivo e invalida lista + ficha específica', async () => {
    (apiClient.uploadFotoFichaCasal as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const file = new File(['foto'], 'foto.jpg');

    const { result } = renderHook(() => useUploadFotoFichaCasal('c1'), { wrapper: Wrapper });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.uploadFotoFichaCasal).toHaveBeenCalledWith('c1', file);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas-casais'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas-casais', 'c1'] });
  });
});

describe('useRemoverFotoFichaCasal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('remove a foto e invalida lista + ficha específica', async () => {
    (apiClient.removerFotoFichaCasal as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRemoverFotoFichaCasal('c1'), { wrapper: Wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.removerFotoFichaCasal).toHaveBeenCalledWith('c1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas-casais'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas-casais', 'c1'] });
  });
});
