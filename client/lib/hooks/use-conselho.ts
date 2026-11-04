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

// Gestão das contas de paróquia (só Conselho) — invalidam a lista pra status/e-mail atualizarem.
export function useCriarParoquia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { nome: string; email: string }) => apiClient.createParoquia(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paroquias'] }),
  });
}

export function useAlterarEmailParoquia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      apiClient.alterarEmailParoquia(id, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paroquias'] }),
  });
}

export function useRedefinirAcessoParoquia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.redefinirAcessoParoquia(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paroquias'] }),
  });
}
