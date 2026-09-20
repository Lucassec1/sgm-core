import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('../api-client', () => ({
  apiClient: {
    conselhoListMontagens: vi.fn(),
    conselhoGetMontagem: vi.fn(),
    conselhoListObservacoes: vi.fn(),
    conselhoCriarObservacao: vi.fn(),
    listParoquias: vi.fn(),
  },
}));

import { apiClient } from '../api-client';
import {
  useConselhoMontagens,
  useConselhoMontagem,
  useConselhoObservacoes,
  useCriarObservacao,
  useParoquias,
} from './use-conselho';

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useConselhoMontagens', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca montagens do conselho com os params certos', async () => {
    const resposta = { items: [], total: 0, page: 1, pageSize: 20 };
    (apiClient.conselhoListMontagens as ReturnType<typeof vi.fn>).mockResolvedValue(resposta);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useConselhoMontagens({ status: 'FINALIZADA' }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.conselhoListMontagens).toHaveBeenCalledWith({ status: 'FINALIZADA' });
  });
});

describe('useConselhoMontagem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca a montagem quando há id', async () => {
    (apiClient.conselhoGetMontagem as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'm1' });
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useConselhoMontagem('m1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.conselhoGetMontagem).toHaveBeenCalledWith('m1');
  });

  it('não busca quando o id é undefined', () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useConselhoMontagem(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useConselhoObservacoes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca observações quando há montagemId', async () => {
    (apiClient.conselhoListObservacoes as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useConselhoObservacoes('m1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.conselhoListObservacoes).toHaveBeenCalledWith('m1');
  });

  it('não busca quando montagemId é undefined', () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useConselhoObservacoes(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCriarObservacao', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria a observação e invalida a lista de observações dessa montagem', async () => {
    (apiClient.conselhoCriarObservacao as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'o1' });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCriarObservacao('m1'), { wrapper: Wrapper });
    result.current.mutate('texto da observação');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.conselhoCriarObservacao).toHaveBeenCalledWith('m1', 'texto da observação');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['conselho', 'montagens', 'm1', 'observacoes'],
    });
  });
});

describe('useParoquias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca a lista de paróquias', async () => {
    (apiClient.listParoquias as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'p1' }]);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useParoquias(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'p1' }]);
  });
});
