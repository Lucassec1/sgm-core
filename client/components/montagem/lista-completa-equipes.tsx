import { AlocacaoStatusBadge } from './alocacao-status-badge';
import type { Alocacao, VagaMontagem } from '@/lib/types';

function nomeAlocacao(alocacao: Alocacao) {
  return alocacao.ficha?.nomeCompleto ?? (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—');
}

// Lista por extenso — mesmas equipes do Quadro em Cards, mas em texto corrido, uma equipe
// abaixo da outra, pra conferir/imprimir sem precisar abrir cada Drawer.
export function ListaCompletaEquipes({
  gruposPorEquipe,
  alocacoesPorVaga,
}: {
  gruposPorEquipe: VagaMontagem[][];
  alocacoesPorVaga: Map<string, Alocacao[]>;
}) {
  return (
    <div className="space-y-8">
      {gruposPorEquipe.map((vagas) => {
        const equipe = vagas[0].equipe;
        const totalPessoas = vagas.flatMap((v) => alocacoesPorVaga.get(v.id) ?? []).filter(
          (a) => !['RECUSADO', 'DESISTIU', 'SUBSTITUIDO'].includes(a.status),
        ).length;

        return (
          <div key={vagas[0].equipeId}>
            <h3 className="text-base font-semibold border-b pb-1 mb-2">
              {equipe.nome} <span className="text-sm font-normal text-muted-foreground">({totalPessoas} pessoa(s))</span>
            </h3>
            <div className="space-y-3">
              {vagas.map((vaga) => {
                const alocacoes = alocacoesPorVaga.get(vaga.id) ?? [];
                return (
                  <div key={vaga.id}>
                    <p className="text-sm font-medium text-muted-foreground">{vaga.cargo.nome}</p>
                    {alocacoes.length === 0 ? (
                      <p className="text-sm text-muted-foreground pl-3">— ninguém alocado —</p>
                    ) : (
                      <ul className="pl-3">
                        {alocacoes.map((alocacao) => (
                          <li key={alocacao.id} className="flex items-center gap-2 text-sm py-0.5">
                            <span>{nomeAlocacao(alocacao)}</span>
                            <AlocacaoStatusBadge status={alocacao.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
