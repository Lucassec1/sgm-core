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

export function useCandidatosJovens(montagemId: string | undefined, vagaMontagemId: string | undefined) {
  return useQuery({
    queryKey: ['montagens', montagemId, 'candidatos-jovens', vagaMontagemId],
    queryFn: () => apiClient.listCandidatosJovens(montagemId as string, vagaMontagemId as string),
    enabled: !!montagemId && !!vagaMontagemId,
  });
}

// R3 — Grupo A (já serviu como equipista naquela equipe) + Grupo B (já foi Equipe
// Dirigente/Comando Geral). Usado pra restringir a busca em vagas de Coordenação, já que
// quem não se encaixa em nenhum dos dois grupos nem aparece como opção (bloqueio, não aviso).
export function useCoordenadoresSugeridos(montagemId: string | undefined, equipeId: string | undefined) {
  return useQuery({
    queryKey: ['montagens', montagemId, 'coordenadores-sugeridos', equipeId],
    queryFn: () => apiClient.coordenadoresSugeridos(montagemId as string, equipeId as string),
    enabled: !!montagemId && !!equipeId,
  });
}

export function useCreateAlocacao(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createAlocacao>[1]) => apiClient.createAlocacao(montagemId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['montagens', montagemId, 'alocacoes'] }),
  });
}

export function useDeleteAlocacao(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteAlocacao(montagemId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['montagens', montagemId, 'alocacoes'] }),
  });
}

export function useUpdateAlocacao(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof apiClient.updateAlocacao>[2]) =>
      apiClient.updateAlocacao(montagemId, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['montagens', montagemId, 'alocacoes'] }),
  });
}

// Sem vagaMontagemId: candidatos gerais (todos os jovens ATIVA elegíveis, sem filtro de
// sexo) — usado na lista de substituição, que não é presa a uma vaga específica.
export function useCandidatosJovensGeral(montagemId: string | undefined) {
  return useQuery({
    queryKey: ['montagens', montagemId, 'candidatos-jovens', 'geral'],
    queryFn: () => apiClient.listCandidatosJovens(montagemId as string),
    enabled: !!montagemId,
  });
}

export function useListaSubstituicao(montagemId: string | undefined) {
  return useQuery({
    queryKey: ['montagens', montagemId, 'lista-substituicao'],
    queryFn: () => apiClient.listListaSubstituicao(montagemId as string),
    enabled: !!montagemId,
  });
}

export function useCreateListaSubstituicaoItem(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createListaSubstituicaoItem>[1]) =>
      apiClient.createListaSubstituicaoItem(montagemId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['montagens', montagemId, 'lista-substituicao'] }),
  });
}

export function useDeleteListaSubstituicaoItem(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteListaSubstituicaoItem(montagemId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['montagens', montagemId, 'lista-substituicao'] }),
  });
}
