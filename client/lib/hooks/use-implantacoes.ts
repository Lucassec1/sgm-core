import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type { AcaoImplantacao } from '../api/conselho';

// Implantação (docs/implantacao.md) — lado do Conselho, que cria e conduz os vínculos.
export function useImplantacoes() {
  return useQuery({
    queryKey: ['conselho', 'implantacoes'],
    queryFn: () => apiClient.listImplantacoes(),
  });
}

export function useCriarImplantacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { afilhadaNome: string; madrinhaId: string }) =>
      apiClient.criarImplantacao(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conselho', 'implantacoes'] });
      queryClient.invalidateQueries({ queryKey: ['paroquias'] });
    },
  });
}

export function useAvancarImplantacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, acao }: { id: string; acao: AcaoImplantacao }) =>
      apiClient.avancarImplantacao(id, acao),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conselho', 'implantacoes'] }),
  });
}

export function useLiberarAcessoAfilhada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      apiClient.liberarAcessoAfilhada(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conselho', 'implantacoes'] });
      queryClient.invalidateQueries({ queryKey: ['paroquias'] });
    },
  });
}
