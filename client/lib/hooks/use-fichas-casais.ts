import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type ListFichasCasaisParams } from '../api-client';
import type { FichaCasal } from '../types';

export function useFichasCasais(params: ListFichasCasaisParams) {
  return useQuery({
    queryKey: ['fichas-casais', params],
    queryFn: () => apiClient.listFichasCasais(params),
  });
}

export function useFichaCasal(id: string | undefined) {
  return useQuery({
    queryKey: ['fichas-casais', id],
    queryFn: () => apiClient.getFichaCasal(id as string),
    enabled: !!id,
  });
}

export function useCreateFichaCasal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FichaCasal>) => apiClient.createFichaCasal(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fichas-casais'] }),
  });
}

export function useUpdateFichaCasal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FichaCasal>) => apiClient.updateFichaCasal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas-casais'] });
      queryClient.invalidateQueries({ queryKey: ['fichas-casais', id] });
    },
  });
}
