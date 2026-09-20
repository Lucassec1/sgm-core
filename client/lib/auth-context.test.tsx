import { render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('./api-client', () => ({
  apiClient: {
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

import { apiClient } from './api-client';
import { useSessao, useLogout, SessaoExpiradaListener } from './auth-context';

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useSessao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve a sessão atual quando apiClient.me tem sucesso', async () => {
    const sessao = { id: '1', login: 'x', role: 'PAROQUIA', nome: null, paroquia: null };
    (apiClient.me as ReturnType<typeof vi.fn>).mockResolvedValue(sessao);
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sessao);
  });

  it('não tenta de novo quando apiClient.me falha (401 esperado)', async () => {
    (apiClient.me as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'));
    const { Wrapper } = wrapper();

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(apiClient.me).toHaveBeenCalledTimes(1);
  });
});

describe('useLogout', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('chama apiClient.logout, invalida a sessão e redireciona pro /login', async () => {
    (apiClient.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.logout).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] });
    expect(window.location.href).toBe('/login');
  });
});

describe('SessaoExpiradaListener', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('invalida a sessão e redireciona pro /login quando não está nele', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/fichas', href: '' },
    });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(<SessaoExpiradaListener />, { wrapper: Wrapper });
    window.dispatchEvent(new Event('sgm:sessao-expirada'));

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] }));
    expect(window.location.href).toBe('/login');
  });

  it('não redireciona de novo quando já está no /login', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/login', href: '' },
    });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(<SessaoExpiradaListener />, { wrapper: Wrapper });
    window.dispatchEvent(new Event('sgm:sessao-expirada'));

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    expect(window.location.href).toBe('');
  });

  it('remove o listener ao desmontar', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/fichas', href: '' },
    });
    const { Wrapper, queryClient } = wrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { unmount } = render(<SessaoExpiradaListener />, { wrapper: Wrapper });
    unmount();
    window.dispatchEvent(new Event('sgm:sessao-expirada'));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
