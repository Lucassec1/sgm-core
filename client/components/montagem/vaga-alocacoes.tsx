'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { CirculoBadge } from '@/components/fichas/circulo-badge';
import { useDeleteAlocacao } from '@/lib/hooks/use-montagens';
import { AlocacaoAvaliacaoPopover } from './alocacao-avaliacao-popover';
import { AlocacaoRowActions } from './alocacao-row-actions';
import { AlocacaoStatusBadge } from './alocacao-status-badge';
import { AlocarPessoaCombobox } from './alocar-pessoa-combobox';
import { PessoaPreviewPopover } from './pessoa-preview-popover';
import type { Alocacao, VagaMontagem } from '@/lib/types';

function nomeAlocacao(alocacao: Alocacao) {
  return alocacao.ficha?.nomeCompleto ?? (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—');
}

// Um cargo (VagaMontagem) com quem já está alocado + ação de adicionar — usado tanto na
// Drawer da equipe quanto na Lista completa, pra ter os mesmos poderes nos dois lugares.
export function VagaAlocacoes({
  montagemId,
  vaga,
  alocacoes,
  todasVagas,
  todasAlocacoes,
  encontroAnterior,
}: {
  montagemId: string;
  vaga: VagaMontagem;
  alocacoes: Alocacao[];
  todasVagas: VagaMontagem[];
  todasAlocacoes: Alocacao[];
  encontroAnterior: number;
}) {
  const deleteAlocacao = useDeleteAlocacao(montagemId);

  const ativas = alocacoes.filter((a) => !['RECUSADO', 'DESISTIU', 'SUBSTITUIDO'].includes(a.status));
  const idsJaAlocados = new Set(ativas.map((a) => a.fichaId ?? a.fichaCasalId ?? ''));

  const precisaJovem = vaga.quantidadeRapazes > 0 || vaga.quantidadeMocas > 0;
  const precisaCasal = vaga.quantidadeCasais > 0;
  const totalVaga = vaga.quantidadeCasais + vaga.quantidadeRapazes + vaga.quantidadeMocas;
  const cheia = ativas.length >= totalVaga;

  async function remover(id: string) {
    try {
      await deleteAlocacao.mutateAsync(id);
      toast.success('Alocação removida.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover.');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{vaga.cargo.nome}</h3>
        <span className="text-xs text-muted-foreground">
          {ativas.length} / {totalVaga}
          {vaga.quantidadeCasais > 0 && ' casais'}
          {(vaga.quantidadeRapazes > 0 || vaga.quantidadeMocas > 0) &&
            ` (${vaga.quantidadeRapazes} rapazes, ${vaga.quantidadeMocas} moças)`}
        </span>
      </div>

      {alocacoes.length > 0 && (
        <ul className="space-y-1">
          {alocacoes.map((alocacao) => {
            // Badge de círculo só pra quem vivenciou o encontro imediatamente anterior — ajuda
            // a conferir que todo mundo que "deve" servir pela primeira vez está mesmo aqui
            // (ver docs/regras-imutaveis.md, R5).
            const destacarCirculo = alocacao.ficha?.numeroEncontro === encontroAnterior;

            return (
              <li key={alocacao.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="min-w-0 truncate">
                    <PessoaPreviewPopover ficha={alocacao.ficha} fichaCasal={alocacao.fichaCasal}>
                      {nomeAlocacao(alocacao)}
                    </PessoaPreviewPopover>
                  </div>
                  {destacarCirculo && alocacao.ficha && <CirculoBadge cor={alocacao.ficha.corCirculo} />}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AlocacaoStatusBadge status={alocacao.status} />
                  <AlocacaoRowActions montagemId={montagemId} alocacao={alocacao} />
                  {alocacao.status === 'ACEITO' && <AlocacaoAvaliacaoPopover montagemId={montagemId} alocacao={alocacao} />}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remover(alocacao.id)} aria-label="Remover alocação">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!cheia && (
        <div className="flex gap-2">
          {precisaJovem && (
            <AlocarPessoaCombobox
              montagemId={montagemId}
              vagaMontagemId={vaga.id}
              equipeId={vaga.equipeId}
              ehCoordenacao={vaga.cargo.ehCoordenacao}
              tipoPessoa="JOVEM"
              label="Adicionar jovem"
              idsJaAlocados={idsJaAlocados}
              todasVagas={todasVagas}
              todasAlocacoes={todasAlocacoes}
            />
          )}
          {precisaCasal && (
            <AlocarPessoaCombobox
              montagemId={montagemId}
              vagaMontagemId={vaga.id}
              equipeId={vaga.equipeId}
              ehCoordenacao={vaga.cargo.ehCoordenacao}
              tipoPessoa="CASAL"
              label="Adicionar casal"
              idsJaAlocados={idsJaAlocados}
              todasVagas={todasVagas}
              todasAlocacoes={todasAlocacoes}
            />
          )}
        </div>
      )}
    </div>
  );
}
