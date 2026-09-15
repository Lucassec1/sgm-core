'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

// Sessão atual — espelha o padrão de hooks de domínio do projeto (ver lib/hooks/), só que
// pra Auth. `retry: false` porque um 401 aqui é esperado (usuário deslogado), não uma falha
// transitória de rede.
export function useSessao() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.me(),
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      window.location.href = '/login';
    },
  });
}

// Escuta o evento disparado por `request()` (api-client.ts) em qualquer 401 — sessão expirada
// ou cookie ausente. Fica num componente próprio (montado uma vez em <Providers>) porque o
// evento pode disparar fora de qualquer página específica.
export function SessaoExpiradaListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    function aoExpirar() {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    window.addEventListener('sgm:sessao-expirada', aoExpirar);
    return () => window.removeEventListener('sgm:sessao-expirada', aoExpirar);
  }, [queryClient]);

  return null;
}
