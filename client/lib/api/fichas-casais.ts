import type { FichaCasal, FichaCasalListResponse, HistoricoEquipeItem } from '../types';
import { API_URL, ApiError, buildQuery, request } from './request';

export interface ListFichasCasaisParams {
  nome?: string;
  situacao?: string;
  page?: number;
  pageSize?: number;
}

export const fichasCasaisApi = {
  listFichasCasais(params: ListFichasCasaisParams) {
    return request<FichaCasalListResponse>(`/fichas-casais?${buildQuery(params)}`);
  },

  getFichaCasal(id: string) {
    return request<FichaCasal>(`/fichas-casais/${id}`);
  },

  createFichaCasal(data: Partial<FichaCasal>) {
    return request<FichaCasal>('/fichas-casais', { method: 'POST', body: JSON.stringify(data) });
  },

  updateFichaCasal(id: string, data: Partial<FichaCasal>) {
    return request<FichaCasal>(`/fichas-casais/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteFichaCasal(id: string) {
    return request<void>(`/fichas-casais/${id}`, { method: 'DELETE' });
  },

  historicoEquipesFichaCasal(id: string) {
    return request<HistoricoEquipeItem[]>(`/fichas-casais/${id}/historico-equipes`);
  },

  async uploadFotoFichaCasal(id: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/fichas-casais/${id}/foto`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = (body?.message as string) ?? `Erro ${res.status} ao enviar a foto`;
      throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status, body);
    }
    return res.json() as Promise<FichaCasal>;
  },

  removerFotoFichaCasal(id: string) {
    return request<FichaCasal>(`/fichas-casais/${id}/foto`, { method: 'DELETE' });
  },

  exportFichasCasaisUrl() {
    return `${API_URL}/fichas-casais/export`;
  },
};
