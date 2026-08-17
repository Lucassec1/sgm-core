'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api-client';
import { useUpdateAlocacao } from '@/lib/hooks/use-montagens';
import { VagaAlocacoes } from './vaga-alocacoes';
import type { Alocacao, VagaMontagem } from '@/lib/types';

function nomeAlocacao(alocacao: Alocacao) {
  return alocacao.ficha?.nomeCompleto ?? (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—');
}

// Drawer lateral de distribuição de uma equipe (docs/ux-e-fluxos.md, seção 3) — mantém o
// Quadro das 16 Equipes visível atrás dele. Cada vaga (cargo) usa VagaAlocacoes, o mesmo
// bloco reaproveitado na Lista completa.
export function EquipeDrawer({
  montagemId,
  vagas,
  alocacoesPorVaga,
  circulosFechado,
  todasVagas,
  todasAlocacoes,
  encontroAnterior,
  open,
  onOpenChange,
}: {
  montagemId: string;
  vagas: VagaMontagem[];
  alocacoesPorVaga: Map<string, Alocacao[]>;
  circulosFechado: boolean;
  todasVagas: VagaMontagem[];
  todasAlocacoes: Alocacao[];
  encontroAnterior: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const equipe = vagas[0]?.equipe;
  const updateAlocacao = useUpdateAlocacao(montagemId);

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
          {vagas.map((vaga) => (
            <div key={vaga.id}>
              <VagaAlocacoes
                montagemId={montagemId}
                vaga={vaga}
                alocacoes={alocacoesPorVaga.get(vaga.id) ?? []}
                todasVagas={todasVagas}
                todasAlocacoes={todasAlocacoes}
                encontroAnterior={encontroAnterior}
              />
              <Separator className="mt-4" />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
