'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api-client';
import { useDeleteAlocacao, useUpdateAlocacao } from '@/lib/hooks/use-montagens';
import { AlocacaoRowActions } from './alocacao-row-actions';
import { AlocacaoStatusBadge } from './alocacao-status-badge';
import { AlocarPessoaCombobox } from './alocar-pessoa-combobox';
import { PessoaPreviewPopover } from './pessoa-preview-popover';
import type { Alocacao, VagaMontagem } from '@/lib/types';

function nomeAlocacao(alocacao: Alocacao) {
  return alocacao.ficha?.nomeCompleto ?? (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—');
}

// Drawer lateral de distribuição de uma equipe (docs/ux-e-fluxos.md, seção 3) — mantém o
// Quadro das 16 Equipes visível atrás dele. Cada vaga (cargo) lista quem já está alocado
// e um combobox de busca pra preencher o que falta.
export function EquipeDrawer({
  montagemId,
  vagas,
  alocacoesPorVaga,
  circulosFechado,
  todasVagas,
  todasAlocacoes,
  open,
  onOpenChange,
}: {
  montagemId: string;
  vagas: VagaMontagem[];
  alocacoesPorVaga: Map<string, Alocacao[]>;
  circulosFechado: boolean;
  todasVagas: VagaMontagem[];
  todasAlocacoes: Alocacao[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const equipe = vagas[0]?.equipe;
  const deleteAlocacao = useDeleteAlocacao(montagemId);
  const updateAlocacao = useUpdateAlocacao(montagemId);

  async function remover(id: string) {
    try {
      await deleteAlocacao.mutateAsync(id);
      toast.success('Alocação removida.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover.');
    }
  }

  const emRascunho = vagas.flatMap((v) => alocacoesPorVaga.get(v.id) ?? []).filter((a) => a.status === 'RASCUNHO');
  const convitesBloqueados = !!equipe?.bloqueiaConvitePosCirculos && !circulosFechado;

  async function convidarEquipe() {
    let sucessos = 0;
    for (const alocacao of emRascunho) {
      try {
        await updateAlocacao.mutateAsync({ id: alocacao.id, status: 'CONVIDADO' });
        sucessos++;
      } catch (err) {
        toast.error(
          `${nomeAlocacao(alocacao)}: ${err instanceof ApiError ? err.message : 'não foi possível convidar'}`,
        );
      }
    }
    if (sucessos > 0) toast.success(`Convite enviado pra ${sucessos} pessoa(s).`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>{equipe?.nome}</SheetTitle>
            {emRascunho.length > 0 && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" disabled={convitesBloqueados} onClick={convidarEquipe}>
                        Convidar ({emRascunho.length})
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {convitesBloqueados && (
                    <TooltipContent>Aguardando Eq. dos Círculos fechar (R4)</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <SheetDescription>Distribuição das vagas dessa equipe.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {vagas.map((vaga) => {
            const alocacoes = alocacoesPorVaga.get(vaga.id) ?? [];
            const ativas = alocacoes.filter((a) => !['RECUSADO', 'DESISTIU', 'SUBSTITUIDO'].includes(a.status));
            const idsJaAlocados = new Set(ativas.map((a) => a.fichaId ?? a.fichaCasalId ?? ''));

            const precisaJovem = vaga.quantidadeRapazes > 0 || vaga.quantidadeMocas > 0;
            const precisaCasal = vaga.quantidadeCasais > 0;
            const totalVaga = vaga.quantidadeCasais + vaga.quantidadeRapazes + vaga.quantidadeMocas;
            const cheia = ativas.length >= totalVaga;

            return (
              <div key={vaga.id} className="space-y-2">
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
                    {alocacoes.map((alocacao) => (
                      <li key={alocacao.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                        <PessoaPreviewPopover ficha={alocacao.ficha} fichaCasal={alocacao.fichaCasal}>
                          {nomeAlocacao(alocacao)}
                        </PessoaPreviewPopover>
                        <div className="flex items-center gap-2">
                          <AlocacaoStatusBadge status={alocacao.status} />
                          <AlocacaoRowActions montagemId={montagemId} alocacao={alocacao} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => remover(alocacao.id)}
                            aria-label="Remover alocação"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {!cheia && (
                  <div className="flex gap-2">
                    {precisaJovem && (
                      <AlocarPessoaCombobox
                        montagemId={montagemId}
                        vagaMontagemId={vaga.id}
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
                        tipoPessoa="CASAL"
                        label="Adicionar casal"
                        idsJaAlocados={idsJaAlocados}
                        todasVagas={todasVagas}
                        todasAlocacoes={todasAlocacoes}
                      />
                    )}
                  </div>
                )}

                <Separator className="mt-4" />
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
