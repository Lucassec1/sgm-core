import type {
  Alocacao,
  CandidatoCasal,
  CandidatoJovem,
  CoordenadoresSugeridos,
  Equipe,
  ListaSubstituicaoItem,
  LogAtividadeItem,
  ObservacaoConselho,
  Montagem,
  MontagemListResponse,
  QuadranteArquivo,
  ResumoMontagem,
} from '../types';
import { API_URL, ApiError, buildQuery, request } from './request';

export interface ListMontagensParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export const montagensApi = {
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

  createAlocacao(
    montagemId: string,
    data: {
      vagaMontagemId: string;
      tipoPessoa: 'JOVEM' | 'CASAL';
      fichaId?: string;
      fichaCasalId?: string;
      status?: 'RASCUNHO' | 'CONVIDADO' | 'ACEITO';
      confirmarAvisos?: boolean;
      usuario?: string;
    },
  ) {
    return request<Alocacao>(`/montagens/${montagemId}/alocacoes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteAlocacao(montagemId: string, id: string) {
    return request<Alocacao>(`/montagens/${montagemId}/alocacoes/${id}`, { method: 'DELETE' });
  },

  updateAlocacao(
    montagemId: string,
    id: string,
    data: {
      status?: 'CONVIDADO' | 'ACEITO' | 'RECUSADO' | 'DESISTIU';
      motivoRecusa?: string;
      podeCoordenar?: boolean;
      podePalestrar?: boolean;
      confirmarAvisos?: boolean;
      usuario?: string;
    },
  ) {
    return request<Alocacao>(`/montagens/${montagemId}/alocacoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  listCandidatosJovens(montagemId: string, vagaMontagemId?: string) {
    return request<CandidatoJovem[]>(
      `/montagens/${montagemId}/candidatos-jovens?${buildQuery({ vagaMontagemId })}`,
    );
  },

  listCandidatosCasais(montagemId: string, vagaMontagemId?: string) {
    return request<CandidatoCasal[]>(
      `/montagens/${montagemId}/candidatos-casais?${buildQuery({ vagaMontagemId })}`,
    );
  },

  coordenadoresSugeridos(montagemId: string, equipeId: string) {
    return request<CoordenadoresSugeridos>(
      `/montagens/${montagemId}/equipes/${equipeId}/coordenadores-sugeridos`,
    );
  },

  listListaSubstituicao(montagemId: string) {
    return request<ListaSubstituicaoItem[]>(`/montagens/${montagemId}/lista-substituicao`);
  },

  createListaSubstituicaoItem(
    montagemId: string,
    data: {
      tipoPessoa: 'JOVEM' | 'CASAL';
      fichaId?: string;
      fichaCasalId?: string;
      nota?: string;
      usuario?: string;
    },
  ) {
    return request<ListaSubstituicaoItem>(`/montagens/${montagemId}/lista-substituicao`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteListaSubstituicaoItem(montagemId: string, id: string) {
    return request<ListaSubstituicaoItem>(`/montagens/${montagemId}/lista-substituicao/${id}`, {
      method: 'DELETE',
    });
  },

  listLog(montagemId: string) {
    return request<LogAtividadeItem[]>(`/montagens/${montagemId}/log`);
  },

  listObservacoes(montagemId: string) {
    return request<ObservacaoConselho[]>(`/montagens/${montagemId}/observacoes`);
  },

  resumoMontagem(montagemId: string) {
    return request<ResumoMontagem>(`/montagens/${montagemId}/resumo`);
  },

  listQuadrantes(montagemId: string) {
    return request<QuadranteArquivo[]>(`/montagens/${montagemId}/quadrantes`);
  },

  // Upload é multipart — não passa pelo `request` (que força Content-Type: application/json).
  async uploadQuadrante(montagemId: string, file: File, usuario?: string) {
    const form = new FormData();
    form.append('file', file);
    if (usuario) form.append('usuario', usuario);
    const res = await fetch(`${API_URL}/montagens/${montagemId}/quadrantes`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = (body?.message as string) ?? `Erro ${res.status} ao enviar o arquivo`;
      throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status, body);
    }
    return res.json() as Promise<QuadranteArquivo>;
  },

  quadranteDownloadUrl(montagemId: string, id: string) {
    return `${API_URL}/montagens/${montagemId}/quadrantes/${id}/download`;
  },

  deleteQuadrante(montagemId: string, id: string) {
    return request<QuadranteArquivo>(`/montagens/${montagemId}/quadrantes/${id}`, {
      method: 'DELETE',
    });
  },

  exportMontagemUrl(montagemId: string) {
    return `${API_URL}/montagens/${montagemId}/export`;
  },
};
