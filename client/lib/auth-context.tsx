'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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

// Madrinha passando a atuar como afilhada (implantacaoId) ou voltando pra própria paróquia
// (null). A sessão troca de paróquia, então nenhum dado em cache pode sobreviver: limpa tudo,
// já grava a sessão nova e volta pro Início.
export function useAtuar() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (implantacaoId: string | null) =>
      implantacaoId ? apiClient.atuar(implantacaoId) : apiClient.pararDeAtuar(),
    onSuccess: async (sessao) => {
      await limparCacheOffline();
      queryClient.clear();
      queryClient.setQueryData(['auth', 'me'], sessao);
      router.push('/');
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

// Fase da implantação mudou enquanto a madrinha atuava pela afilhada: o server recusou a ação e a
// sessão já voltou pra madrinha. Descarta tudo da afilhada em memória (recarga completa) e avisa
// no Início.
export function AtuacaoEncerradaListener() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('atuacao') === 'encerrada') {
      toast.info('A implantação mudou de fase: você voltou para a sua paróquia.');
      url.searchParams.delete('atuacao');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    function aoEncerrar() {
      void limparCacheOffline().finally(() => {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa proposital: descarta o estado da afilhada
        window.location.href = '/?atuacao=encerrada';
      });
    }
    window.addEventListener('sgm:atuacao-encerrada', aoEncerrar);
    return () => window.removeEventListener('sgm:atuacao-encerrada', aoEncerrar);
  }, []);

  return null;
}
