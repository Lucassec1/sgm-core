import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('../api-client', () => ({
  apiClient: {
    getTelaoMontagem: vi.fn(),
  },
}));

import { apiClient } from '../api-client';
import { useTelaoMontagem } from './use-telao';

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useTelaoMontagem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca a montagem do telão quando há id', async () => {
    (apiClient.getTelaoMontagem as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'm1' });
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useTelaoMontagem('m1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.getTelaoMontagem).toHaveBeenCalledWith('m1');
  });

  it('não busca quando o id é undefined', () => {
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useTelaoMontagem(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(apiClient.getTelaoMontagem).not.toHaveBeenCalled();
  });
});
