import type {
  Alocacao,
  Equipe,
  Ficha,
  FichaCasal,
  FichaCasalListResponse,
  FichaListResponse,
  Montagem,
  MontagemListResponse,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Erro ${res.status} ao chamar ${path}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ListFichasParams {
  paroquiaId: string;
  nome?: string;
  numeroEncontro?: number;
  situacao?: string;
  page?: number;
  pageSize?: number;
}

export interface ListFichasCasaisParams {
  paroquiaId: string;
  nome?: string;
  situacao?: string;
  page?: number;
  pageSize?: number;
}

export interface ListMontagensParams {
  paroquiaId: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(params: object) {
  const query = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const apiClient = {
  baseUrl: API_URL,

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

  listEncontros(paroquiaId: string) {
    return request<number[]>(`/fichas/encontros?${buildQuery({ paroquiaId })}`);
  },

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
    return request<FichaCasal>(`/fichas-casais/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  deleteFichaCasal(id: string) {
    return request<void>(`/fichas-casais/${id}`, { method: 'DELETE' });
  },

  listEquipes() {
    return request<Equipe[]>('/equipes');
  },

  listMontagens(params: ListMontagensParams) {
    return request<MontagemListResponse>(`/montagens?${buildQuery(params)}`);
  },

  getMontagem(id: string) {
    return request<Montagem>(`/montagens/${id}`);
  },

  createMontagem(data: Partial<Montagem> & { usuario?: string }) {
    return request<Montagem>('/montagens', { method: 'POST', body: JSON.stringify(data) });
  },

  updateMontagem(id: string, data: Partial<Montagem> & { usuario?: string }) {
    return request<Montagem>(`/montagens/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  listAlocacoes(montagemId: string) {
    return request<Alocacao[]>(`/montagens/${montagemId}/alocacoes`);
  },
};
