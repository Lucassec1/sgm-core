import type { Alocacao, Montagem, VagaMontagem } from '../types';
import { buildQuery, request } from './request';

export interface ParoquiaComConta {
  id: string;
  nome: string;
  usuarios: { id: string; login: string; ativo: boolean; aguardandoPrimeiroAcesso: boolean }[];
}

export const conselhoApi = {
  // Conselho (R8) — leitura cross-paróquia de Montagem + observações.
  listParoquias() {
    return request<ParoquiaComConta[]>('/paroquias');
  },

  // Conselho cria a conta só com o e-mail — a paróquia cria a senha no primeiro acesso.
  createParoquia(data: { nome: string; email: string }) {
    return request<{ id: string; nome: string }>('/paroquias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  alterarEmailParoquia(id: string, email: string) {
    return request<{ ok: true }>(`/paroquias/${id}/email`, {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    });
  },

  // Apaga a senha e derruba as sessões: a conta volta pro primeiro acesso (virada de equipe).
  redefinirAcessoParoquia(id: string) {
    return request<{ ok: true }>(`/paroquias/${id}/redefinir-acesso`, { method: 'PATCH' });
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
