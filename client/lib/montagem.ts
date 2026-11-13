import type { Alocacao, VagaMontagem } from './types';

// Uma alocação ainda ocupa a vaga enquanto não foi recusada/desistida/substituída — mesmo
// em RASCUNHO, já dá pra contar como "preenchida" (a equipe dirigente rascunha a distribuição
// antes de formalizar o convite, ver docs/ux-e-fluxos.md, seção 1.2).
export const STATUS_OCUPA_VAGA = ['RASCUNHO', 'CONVIDADO', 'ACEITO'];

export interface ResumoEquipe {
  totalVagas: number;
  preenchidas: number;
  aceitas: number;
  // Fechada = todas as vagas com alguém que ACEITOU — mesmo critério do R4 pros Círculos
  // ("todos os membros aceitaram"). É o que acende o ouro no quadro e no dashboard.
  fechada: boolean;
}

// Jovens de uma vaga: rapazes + moças + jovens sem sexo definido (vagas dos anexos de
// implantação que dizem só "N jovens").
export function jovensDaVaga(
  vaga: Pick<VagaMontagem, 'quantidadeRapazes' | 'quantidadeMocas' | 'quantidadeJovens'>,
): number {
  return vaga.quantidadeRapazes + vaga.quantidadeMocas + (vaga.quantidadeJovens ?? 0);
}

export function resumoEquipe(vagas: VagaMontagem[], alocacoes: Alocacao[]): ResumoEquipe {
  const totalVagas = vagas.reduce((soma, v) => soma + v.quantidadeCasais + jovensDaVaga(v), 0);
  const preenchidas = alocacoes.filter((a) => STATUS_OCUPA_VAGA.includes(a.status)).length;
  const aceitas = alocacoes.filter((a) => a.status === 'ACEITO').length;
  return { totalVagas, preenchidas, aceitas, fechada: totalVagas > 0 && aceitas >= totalVagas };
}

// Nome de quem está numa alocação — jovem pelo nome completo, casal como "Fulano e Fulana".
export function nomeAlocacao(alocacao: Pick<Alocacao, 'ficha' | 'fichaCasal'>): string {
  return (
    alocacao.ficha?.nomeCompleto ??
    (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—')
  );
}

// Ordem do quadro: equipe (ordem do catálogo), depois cargo.
export function ordenarPorEquipe(a: Alocacao, b: Alocacao): number {
  const porEquipe = a.vagaMontagem.equipe.ordem - b.vagaMontagem.equipe.ordem;
  if (porEquipe !== 0) return porEquipe;
  return a.vagaMontagem.cargo.ordem - b.vagaMontagem.cargo.ordem;
}

// Implantação (R7, exceção): a vaga do anexo diz de qual paróquia deveria ser a pessoa — só
// orienta. Numa montagem de anexo (que é da afilhada), quem é de outra paróquia é da madrinha.
export function avisoOrigemVaga(
  origemVaga: VagaMontagem['origem'] | undefined,
  paroquiaPessoaId: string | undefined,
  paroquiaMontagemId: string | undefined,
): string | null {
  if (!origemVaga || !paroquiaPessoaId || !paroquiaMontagemId) return null;
  const origemPessoa = paroquiaPessoaId === paroquiaMontagemId ? 'AFILHADA' : 'MADRINHA';
  if (origemPessoa === origemVaga) return null;
  return origemVaga === 'MADRINHA' ? 'Vaga da madrinha' : 'Vaga da afilhada';
}
