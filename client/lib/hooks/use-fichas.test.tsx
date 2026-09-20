import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('../api-client', () => ({
  apiClient: {
    listFichas: vi.fn(),
    createFicha: vi.fn(),
    listEncontros: vi.fn(),
    getFicha: vi.fn(),
    updateFicha: vi.fn(),
    historicoEquipesFicha: vi.fn(),
    uploadFotoFicha: vi.fn(),
    removerFotoFicha: vi.fn(),
  },
}));

import { apiClient } from '../api-client';
import {
  useFichas,
  useCreateFicha,
  useEncontros,
  useFicha,
  useUpdateFicha,
  useHistoricoEquipes,
  useUploadFotoFicha,
  useRemoverFotoFicha,
} from './use-fichas';

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useFichas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca fichas com os params certos e devolve o resultado', async () => {
    const resposta = { items: [{ id: '1' }], total: 1 };
    (apiClient.listFichas as ReturnType<typeof vi.fn>).mockResolvedValue(resposta);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useFichas({ nome: 'Ana' }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(resposta);
    expect(apiClient.listFichas).toHaveBeenCalledWith({ nome: 'Ana' });
  });

  it('não busca quando enabled é false', async () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useFichas({}, { enabled: false }), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(apiClient.listFichas).not.toHaveBeenCalled();
  });
});

describe('useCreateFicha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalida a query de fichas depois de criar com sucesso', async () => {
    (apiClient.createFicha as ReturnType<typeof vi.fn>).mockResolvedValue({ id: '1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateFicha(), { wrapper: Wrapper });
    result.current.mutate({ nomeCompleto: 'Ana' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas'] });
  });
});

describe('useEncontros', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca a lista de encontros', async () => {
    (apiClient.listEncontros as ReturnType<typeof vi.fn>).mockResolvedValue([1, 2, 3]);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useEncontros(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([1, 2, 3]);
  });
});

describe('useFicha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca a ficha pelo id quando informado', async () => {
    (apiClient.getFicha as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'f1' });
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useFicha('f1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.getFicha).toHaveBeenCalledWith('f1');
  });

  it('não busca quando o id é undefined', () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useFicha(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(apiClient.getFicha).not.toHaveBeenCalled();
  });
});

describe('useUpdateFicha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalida a lista e a ficha específica depois de atualizar', async () => {
    (apiClient.updateFicha as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'f1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateFicha('f1'), { wrapper: Wrapper });
    result.current.mutate({ nomeCompleto: 'Ana' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.updateFicha).toHaveBeenCalledWith('f1', { nomeCompleto: 'Ana' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas', 'f1'] });
  });
});

describe('useHistoricoEquipes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca o histórico quando há fichaId', async () => {
    (apiClient.historicoEquipesFicha as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useHistoricoEquipes('f1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.historicoEquipesFicha).toHaveBeenCalledWith('f1');
  });

  it('não busca quando fichaId é undefined', () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useHistoricoEquipes(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useUploadFotoFicha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o arquivo e invalida lista + ficha específica', async () => {
    (apiClient.uploadFotoFicha as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'f1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const file = new File(['foto'], 'foto.jpg');

    const { result } = renderHook(() => useUploadFotoFicha('f1'), { wrapper: Wrapper });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.uploadFotoFicha).toHaveBeenCalledWith('f1', file);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas', 'f1'] });
  });
});

describe('useRemoverFotoFicha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('remove a foto e invalida lista + ficha específica', async () => {
    (apiClient.removerFotoFicha as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'f1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRemoverFotoFicha('f1'), { wrapper: Wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.removerFotoFicha).toHaveBeenCalledWith('f1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fichas', 'f1'] });
  });
});
