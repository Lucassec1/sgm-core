'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUpdateMontagem } from '@/lib/hooks/use-montagens';
import type { Alocacao, StatusMontagem, VagaMontagem } from '@/lib/types';

function totalDaVaga(vaga: VagaMontagem) {
  return vaga.quantidadeCasais + vaga.quantidadeRapazes + vaga.quantidadeMocas;
}

// Fecha o fluxo "Nova Montagem → ... → Montagem 100% preenchida" (docs/ux-e-fluxos.md, 1.2).
// Finalizar não é bloqueado por preenchimento incompleto (fica a critério da equipe
// dirigente), mas lista as equipes incompletas e exige uma segunda confirmação explícita
// nesse caso — pra não finalizar por engano sem perceber que faltou gente. Depois de
// FINALIZADA, o histórico de substituição some (R9) e a distribuição vira somente leitura.
export function FinalizarMontagemButton({
  montagemId,
  status,
  gruposPorEquipe,
  alocacoesPorVaga,
}: {
  montagemId: string;
  status: StatusMontagem;
  gruposPorEquipe: VagaMontagem[][];
  alocacoesPorVaga: Map<string, Alocacao[]>;
}) {
  const [open, setOpen] = useState(false);
  const [cienteIncompletas, setCienteIncompletas] = useState(false);
  const updateMontagem = useUpdateMontagem(montagemId);

  const equipesIncompletas = gruposPorEquipe
    .map((vagas) => {
      const total = vagas.reduce((soma, v) => soma + totalDaVaga(v), 0);
      const confirmadas = vagas
        .flatMap((v) => alocacoesPorVaga.get(v.id) ?? [])
        .filter((a) => a.status === 'ACEITO').length;
      return { nome: vagas[0]?.equipe.nome, total, confirmadas };
    })
    .filter((e) => e.total > 0 && e.confirmadas < e.total);

  const totalVagas = gruposPorEquipe.flat().reduce((soma, v) => soma + totalDaVaga(v), 0);
  const confirmadas = [...alocacoesPorVaga.values()].flat().filter((a) => a.status === 'ACEITO').length;

  async function finalizar() {
    try {
      await updateMontagem.mutateAsync({ status: 'FINALIZADA' });
      toast.success('Montagem finalizada.');
      setOpen(false);
      setCienteIncompletas(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível finalizar a montagem.');
    }
  }

  async function reabrir() {
    try {
      await updateMontagem.mutateAsync({ status: 'EM_ANDAMENTO' });
      toast.success('Montagem reaberta.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível reabrir a montagem.');
    }
  }

  if (status === 'FINALIZADA') {
    return (
      <Button variant="outline" size="sm" onClick={reabrir} disabled={updateMontagem.isPending}>
        Reabrir
      </Button>
    );
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Finalizar Montagem
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCienteIncompletas(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar montagem?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {confirmadas} de {totalVagas} vagas confirmadas (aceitas). Depois de finalizada, a distribuição vira
                  somente leitura e o histórico de substituição deste encontro deixa de aparecer.
                </p>
                {equipesIncompletas.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    <p className="font-medium">Essas equipes ainda não estão com a quantidade certa de pessoas:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {equipesIncompletas.map((e) => (
                        <li key={e.nome}>
                          {e.nome} — {e.confirmadas}/{e.total}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {equipesIncompletas.length > 0 && (
            <div className="flex items-start gap-2 py-2">
              <Checkbox
                id="ciente-incompletas"
                checked={cienteIncompletas}
                onCheckedChange={(v) => setCienteIncompletas(!!v)}
                className="mt-0.5"
              />
              <Label htmlFor="ciente-incompletas" className="font-normal text-sm">
                Sei que essas equipes estão incompletas e quero finalizar assim mesmo.
              </Label>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={finalizar} disabled={equipesIncompletas.length > 0 && !cienteIncompletas}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
