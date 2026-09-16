import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export function useConselhoMontagens(params: { paroquiaId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['conselho', 'montagens', params],
    queryFn: () => apiClient.conselhoListMontagens(params),
  });
}

export function useConselhoMontagem(id: string | undefined) {
  return useQuery({
    queryKey: ['conselho', 'montagens', id],
    queryFn: () => apiClient.conselhoGetMontagem(id as string),
    enabled: !!id,
  });
}

export function useConselhoObservacoes(montagemId: string | undefined) {
  return useQuery({
    queryKey: ['conselho', 'montagens', montagemId, 'observacoes'],
    queryFn: () => apiClient.conselhoListObservacoes(montagemId as string),
    enabled: !!montagemId,
  });
}

export function useCriarObservacao(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (texto: string) => apiClient.conselhoCriarObservacao(montagemId, texto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conselho', 'montagens', montagemId, 'observacoes'],
      });
    },
  });
}

export function useParoquias() {
  return useQuery({
    queryKey: ['paroquias'],
    queryFn: () => apiClient.listParoquias(),
  });
}
