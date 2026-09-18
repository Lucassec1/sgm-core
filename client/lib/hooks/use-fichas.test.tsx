import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('../api-client', () => ({
  apiClient: {
    listFichas: vi.fn(),
    createFicha: vi.fn(),
  },
}));

import { apiClient } from '../api-client';
import { useFichas, useCreateFicha } from './use-fichas';

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
