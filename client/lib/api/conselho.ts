import type { Alocacao, Montagem, VagaMontagem } from '../types';
import { buildQuery, request } from './request';

export interface ParoquiaComConta {
  id: string;
  nome: string;
  usuarios: { id: string; login: string; ativo: boolean; aguardandoPrimeiroAcesso: boolean }[];
}

export type FaseImplantacao = 'SEMENTEIRA' | 'IMPLANTACAO' | 'ACOMPANHAMENTO' | 'ENCERRADA';

// Vínculo madrinha → afilhada visto pelo Conselho: nunca traz fichas, só a contagem (R8).
export interface ImplantacaoConselho {
  id: string;
  fase: FaseImplantacao;
  madrinha: { id: string; nome: string };
  afilhada: { id: string; nome: string };
  afilhadaTemConta: boolean;
  fichasSementeira: number;
  createdAt: string;
  implantacaoIniciadaEm: string | null;
  acompanhamentoIniciadoEm: string | null;
  encerradaEm: string | null;
}

export type AcaoImplantacao = 'iniciar' | 'acompanhamento' | 'encerrar';

export const conselhoApi = {
  listImplantacoes() {
    return request<ImplantacaoConselho[]>('/conselho/implantacoes');
  },

  criarImplantacao(data: { afilhadaNome: string; madrinhaId: string }) {
    return request<{ id: string }>('/conselho/implantacoes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Fases só andam pra frente: iniciar (Sementeira → Implantação, transfere as fichas),
  // acompanhamento, encerrar.
  avancarImplantacao(id: string, acao: AcaoImplantacao) {
    return request<unknown>(`/conselho/implantacoes/${id}/${acao}`, { method: 'POST' });
  },

  liberarAcessoAfilhada(id: string, email: string) {
    return request<{ ok: true }>(`/conselho/implantacoes/${id}/acesso`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

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
