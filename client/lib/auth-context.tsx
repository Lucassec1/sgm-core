'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

// Mesmo nome de CACHE_NAME em public/sw.js — o cache offline da Montagem guarda dados das
// pessoas alocadas; num computador compartilhado, não pode sobreviver ao fim da sessão.
const CACHE_OFFLINE = 'sgm-montagem-leitura-v1';

async function limparCacheOffline() {
  if (typeof caches === 'undefined') return;
  await caches.delete(CACHE_OFFLINE).catch(() => undefined);
}

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
    onSuccess: async () => {
      await limparCacheOffline();
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa proposital: descarta todo estado em memória da sessão anterior
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
      void limparCacheOffline();
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (window.location.pathname !== '/login') {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa proposital: descarta todo estado em memória da sessão anterior
        window.location.href = '/login';
      }
    }
    window.addEventListener('sgm:sessao-expirada', aoExpirar);
    return () => window.removeEventListener('sgm:sessao-expirada', aoExpirar);
  }, [queryClient]);

  return null;
}
