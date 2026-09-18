import type {
  Alocacao,
  CoordenadoresSugeridos,
  Equipe,
  Ficha,
  FichaCasal,
  FichaCasalListResponse,
  FichaListResponse,
  HistoricoEquipeItem,
  ListaSubstituicaoItem,
  LogAtividadeItem,
  Montagem,
  MontagemListResponse,
  QuadranteArquivo,
  ResumoMontagem,
  VagaMontagem,
} from './types';
import { markServedFresh, markServedFromCache } from './offline-status';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// 409 de repetição de equipe (R2) chega com um body estruturado (code, vezesServidas,
// equipeNome) — o front precisa distinguir isso de um erro genérico pra oferecer o
// Alert Dialog de confirmação em vez de só mostrar a mensagem.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Dispara em qualquer 401 (sessão expirada/ausente) pra quem estiver ouvindo (ver
// client/lib/auth-context.tsx) redirecionar pro /login. Fica fora do React de propósito —
// `request()` é usado por código que não é componente (ex. Server Components/actions).
function markSessaoExpirada() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sgm:sessao-expirada'));
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });

  // Sinal de "sem conexão" (proposta #6) — só as leituras da Montagem passam pelo Service
  // Worker (public/sw.js), então esse header só aparece nelas; qualquer outra resposta
  // bem-sucedida confirma que a rede está OK e limpa o aviso.
  if (res.headers.get('x-from-cache')) markServedFromCache();
  else markServedFresh();

  if (!res.ok) {
    if (res.status === 401) markSessaoExpirada();
    const body = await res.json().catch(() => null);
    const message = (body?.message as string) ?? `Erro ${res.status} ao chamar ${path}`;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ListFichasParams {
  nome?: string;
  numeroEncontro?: number;
  situacao?: string;
  page?: number;
  pageSize?: number;
}

export interface ListFichasCasaisParams {
  nome?: string;
  situacao?: string;
  page?: number;
  pageSize?: number;
}

export interface ListMontagensParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export type Role = 'PAROQUIA' | 'CONSELHO';

export interface SessaoAtual {
  id: string;
  login: string;
  role: Role;
  nome: string | null;
  paroquia: { id: string; nome: string } | null;
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

  login(login: string, senha: string) {
    return request<SessaoAtual>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, senha }),
    });
  },

  logout() {
    return request<{ ok: true }>('/auth/logout', { method: 'POST' });
  },

  alterarSenha(senhaAtual: string, senhaNova: string) {
    return request<{ ok: true }>('/auth/senha', {
      method: 'PATCH',
      body: JSON.stringify({ senhaAtual, senhaNova }),
    });
  },

  me() {
    return request<SessaoAtual>('/auth/me');
  },

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
      confirmarRepeticao?: boolean;
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
      usuario?: string;
    },
  ) {
    return request<Alocacao>(`/montagens/${montagemId}/alocacoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  listCandidatosJovens(montagemId: string, vagaMontagemId?: string) {
    return request<Ficha[]>(
      `/montagens/${montagemId}/candidatos-jovens?${buildQuery({ vagaMontagemId })}`,
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

  // Exportação simples (docs/producao.md, item 4) — link direto de download, mesmo padrão do
  // quadranteDownloadUrl. Navegação normal do browser (clique em link) envia o cookie de
  // sessão de qualquer jeito, sem precisar de paroquiaId na URL.
  exportFichasUrl() {
    return `${API_URL}/fichas/export`;
  },

  exportFichasCasaisUrl() {
    return `${API_URL}/fichas-casais/export`;
  },

  exportMontagemUrl(montagemId: string) {
    return `${API_URL}/montagens/${montagemId}/export`;
  },

  // Telão (docs/propostas.md, proposta #5) — endpoint público e reduzido, sem login (o guard
  // global exige JWT em tudo, exceto rotas @Public() como esta). Não usar pra nada além do
  // modo telão/impressão: o shape já vem filtrado (só ACEITOS, sem dado sensível).
  getTelaoMontagem(id: string) {
    return request<{
      id: string;
      numeroEncontro: number;
      data: string;
      padroeiro: string | null;
      vagas: {
        id: string;
        equipe: { id: string; nome: string; slug: string; ordem: number };
        cargo: { id: string; nome: string; ordem: number };
        alocacoes: {
          id: string;
          ficha: { nomeCompleto: string } | null;
          fichaCasal: { nomeEle: string; nomeEla: string } | null;
        }[];
      }[];
    }>(`/telao/montagens/${id}`);
  },

  // Conselho (R8) — leitura cross-paróquia de Montagem + observações.
  listParoquias() {
    return request<
      { id: string; nome: string; usuarios: { id: string; login: string; ativo: boolean }[] }[]
    >('/paroquias');
  },

  createParoquia(data: { nome: string; login: string; senha: string }) {
    return request<{ id: string; nome: string }>('/paroquias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resetCredenciaisParoquia(id: string, senha: string) {
    return request<{ ok: true }>(`/paroquias/${id}/credenciais`, {
      method: 'PATCH',
      body: JSON.stringify({ senha }),
    });
  },

  conselhoListMontagens(
    params: { paroquiaId?: string; status?: string; page?: number; pageSize?: number } = {},
  ) {
    return request<{
      items: (Omit<Montagem, 'vagas'> & { paroquia: { id: string; nome: string } })[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/conselho/montagens?${buildQuery(params)}`);
  },

  conselhoGetMontagem(id: string) {
    return request<
      Omit<Montagem, 'vagas'> & {
        paroquia: { id: string; nome: string };
        vagas: (VagaMontagem & { alocacoes: Alocacao[] })[];
      }
    >(`/conselho/montagens/${id}`);
  },

  conselhoListObservacoes(montagemId: string) {
    return request<
      { id: string; texto: string; createdAt: string; usuario: { nome: string | null } }[]
    >(`/conselho/montagens/${montagemId}/observacoes`);
  },

  conselhoCriarObservacao(montagemId: string, texto: string) {
    return request<{ id: string }>(`/conselho/montagens/${montagemId}/observacoes`, {
      method: 'POST',
      body: JSON.stringify({ texto }),
    });
  },
};
