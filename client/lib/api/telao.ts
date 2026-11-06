import { request } from './request';

export const telaoApi = {
  // Telão (docs/historico/propostas.md, proposta #5) — endpoint público e reduzido, sem login (o guard
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
};
