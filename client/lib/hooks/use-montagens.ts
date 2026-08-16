import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type ListMontagensParams } from '../api-client';
import type { Montagem } from '../types';

export function useMontagens(params: ListMontagensParams) {
  return useQuery({
    queryKey: ['montagens', params],
    queryFn: () => apiClient.listMontagens(params),
  });
}

export function useMontagem(id: string | undefined) {
  return useQuery({
    queryKey: ['montagens', id],
    queryFn: () => apiClient.getMontagem(id as string),
    enabled: !!id,
  });
}

export function useEquipes() {
  return useQuery({
    queryKey: ['equipes'],
    queryFn: () => apiClient.listEquipes(),
    staleTime: Infinity,
  });
}

export function useAlocacoes(montagemId: string | undefined) {
  return useQuery({
    queryKey: ['montagens', montagemId, 'alocacoes'],
    queryFn: () => apiClient.listAlocacoes(montagemId as string),
    enabled: !!montagemId,
  });
}

export function useCreateMontagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Montagem> & { usuario?: string }) => apiClient.createMontagem(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['montagens'] }),
  });
}
