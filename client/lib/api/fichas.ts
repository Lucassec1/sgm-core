import type { Ficha, FichaListResponse, HistoricoEquipeItem } from '../types';
import { API_URL, ApiError, buildQuery, request } from './request';

export interface ListFichasParams {
  nome?: string;
  numeroEncontro?: number;
  situacao?: string;
  page?: number;
  pageSize?: number;
}

export const fichasApi = {
  listFichas(params: ListFichasParams) {
    return request<FichaListResponse>(`/fichas?${buildQuery(params)}`);
  },

  getFicha(id: string) {
    return request<Ficha>(`/fichas/${id}`);
  },

  createFicha(data: Partial<Ficha>) {
    return request<Ficha>('/fichas', { method: 'POST', body: JSON.stringify(data) });
  },

  updateFicha(id: string, data: Partial<Ficha>) {
    return request<Ficha>(`/fichas/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  deleteFicha(id: string) {
    return request<void>(`/fichas/${id}`, { method: 'DELETE' });
  },

  historicoEquipesFicha(id: string) {
    return request<HistoricoEquipeItem[]>(`/fichas/${id}/historico-equipes`);
  },

  // Upload é multipart — não passa pelo `request` (que força Content-Type: application/json),
  // mesmo padrão do uploadQuadrante.
  async uploadFotoFicha(id: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/fichas/${id}/foto`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = (body?.message as string) ?? `Erro ${res.status} ao enviar a foto`;
      throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status, body);
    }
    return res.json() as Promise<Ficha>;
  },

  removerFotoFicha(id: string) {
    return request<Ficha>(`/fichas/${id}/foto`, { method: 'DELETE' });
  },

  listEncontros() {
    return request<number[]>('/fichas/encontros');
  },

  // Exportação simples (docs/producao.md, item 4) — link direto de download, mesmo padrão do
  // quadranteDownloadUrl. Navegação normal do browser (clique em link) envia o cookie de
  // sessão de qualquer jeito, sem precisar de paroquiaId na URL.
  exportFichasUrl() {
    return `${API_URL}/fichas/export`;
  },
};
