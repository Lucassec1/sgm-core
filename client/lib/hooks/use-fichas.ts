import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type ListFichasParams } from '../api-client';
import type { Ficha } from '../types';

export function useFichas(params: ListFichasParams) {
  return useQuery({
    queryKey: ['fichas', params],
    queryFn: () => apiClient.listFichas(params),
  });
}

export function useEncontros(paroquiaId: string) {
  return useQuery({
    queryKey: ['fichas', 'encontros', paroquiaId],
    queryFn: () => apiClient.listEncontros(paroquiaId),
  });
}

export function useFicha(id: string | undefined) {
  return useQuery({
    queryKey: ['fichas', id],
    queryFn: () => apiClient.getFicha(id as string),
    enabled: !!id,
  });
}

export function useCreateFicha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Ficha>) => apiClient.createFicha(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fichas'] }),
  });
}

export function useUpdateFicha(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Ficha>) => apiClient.updateFicha(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas'] });
      queryClient.invalidateQueries({ queryKey: ['fichas', id] });
    },
  });
}

export function useHistoricoEquipes(fichaId: string | undefined) {
  return useQuery({
    queryKey: ['fichas', fichaId, 'historico-equipes'],
    queryFn: () => apiClient.historicoEquipesFicha(fichaId as string),
    enabled: !!fichaId,
  });
}
