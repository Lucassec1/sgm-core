import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type ListMontagensParams } from '../api-client';
import type { Montagem } from '../types';

export function useMontagens(params: ListMontagensParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['montagens', params],
    queryFn: () => apiClient.listMontagens(params),
    enabled: options?.enabled ?? true,
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

export function useUpdateMontagem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Montagem> & { usuario?: string }) => apiClient.updateMontagem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['montagens'] });
      queryClient.invalidateQueries({ queryKey: ['montagens', id] });
    },
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

// Alocar/mover/mudar status mexe em várias listas de uma vez (alocações, log de atividade
// R9, e a lista de substituição — de onde a pessoa sai ao ser alocada). Invalida tudo que
// é escopado nessa montagem de uma vez.
function invalidarMontagem(queryClient: ReturnType<typeof useQueryClient>, montagemId: string) {
  return queryClient.invalidateQueries({ queryKey: ['montagens', montagemId] });
}

export function useCreateAlocacao(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createAlocacao>[1]) => apiClient.createAlocacao(montagemId, data),
    onSuccess: () => invalidarMontagem(queryClient, montagemId),
  });
}

export function useDeleteAlocacao(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteAlocacao(montagemId, id),
    onSuccess: () => invalidarMontagem(queryClient, montagemId),
  });
}

export function useUpdateAlocacao(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof apiClient.updateAlocacao>[2]) =>
      apiClient.updateAlocacao(montagemId, id, data),
    onSuccess: () => invalidarMontagem(queryClient, montagemId),
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

export function useLog(montagemId: string | undefined) {
  return useQuery({
    queryKey: ['montagens', montagemId, 'log'],
    queryFn: () => apiClient.listLog(montagemId as string),
    enabled: !!montagemId,
  });
}

// Painel "como foi esse encontro" (docs/propostas.md, proposta #2) — só busca quando a
// montagem está finalizada (`enabled`), que é quando o painel é mostrado.
export function useResumoMontagem(montagemId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['montagens', montagemId, 'resumo'],
    queryFn: () => apiClient.resumoMontagem(montagemId as string),
    enabled: !!montagemId && (options?.enabled ?? true),
  });
}

export function useQuadrantes(montagemId: string | undefined) {
  return useQuery({
    queryKey: ['montagens', montagemId, 'quadrantes'],
    queryFn: () => apiClient.listQuadrantes(montagemId as string),
    enabled: !!montagemId,
  });
}

export function useUploadQuadrante(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, usuario }: { file: File; usuario?: string }) =>
      apiClient.uploadQuadrante(montagemId, file, usuario),
    onSuccess: () => invalidarMontagem(queryClient, montagemId),
  });
}

export function useDeleteQuadrante(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteQuadrante(montagemId, id),
    onSuccess: () => invalidarMontagem(queryClient, montagemId),
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
    onSuccess: () => invalidarMontagem(queryClient, montagemId),
  });
}

export function useDeleteListaSubstituicaoItem(montagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteListaSubstituicaoItem(montagemId, id),
    onSuccess: () => invalidarMontagem(queryClient, montagemId),
  });
}
