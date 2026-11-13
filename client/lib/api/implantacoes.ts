import type { FaseImplantacao } from './conselho';
import { request } from './request';

// Implantação — lado da paróquia madrinha: os vínculos dela e a liberação de fichas para a
// afilhada no Acompanhamento.
export interface ImplantacaoMinha {
  id: string;
  fase: FaseImplantacao;
  afilhada: { id: string; nome: string };
}

export interface LiberacaoFicha {
  id: string;
  fichaId: string | null;
  fichaCasalId: string | null;
}

export const implantacoesApi = {
  minhasImplantacoes() {
    return request<ImplantacaoMinha[]>('/implantacoes/minhas');
  },

  listLiberacoes(implantacaoId: string) {
    return request<LiberacaoFicha[]>(`/implantacoes/${implantacaoId}/liberacoes`);
  },

  liberarFicha(implantacaoId: string, pessoa: { fichaId?: string; fichaCasalId?: string }) {
    return request<LiberacaoFicha>(`/implantacoes/${implantacaoId}/liberacoes`, {
      method: 'POST',
      body: JSON.stringify(pessoa),
    });
  },

  removerLiberacao(implantacaoId: string, liberacaoId: string) {
    return request<{ ok: true }>(`/implantacoes/${implantacaoId}/liberacoes/${liberacaoId}`, {
      method: 'DELETE',
    });
  },
};
