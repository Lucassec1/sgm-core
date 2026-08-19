'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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

// Fecha o fluxo "Nova Montagem → ... → Montagem 100% preenchida" (docs/ux-e-fluxos.md, 1.2).
// Finalizar não é bloqueado por preenchimento incompleto (fica a critério da equipe
// dirigente), só avisa quando falta gente confirmada. Depois de FINALIZADA, o histórico de
// substituição some (R9) e a distribuição vira somente leitura.
export function FinalizarMontagemButton({
  montagemId,
  status,
  vagas,
  alocacoes,
}: {
  montagemId: string;
  status: StatusMontagem;
  vagas: VagaMontagem[];
  alocacoes: Alocacao[];
}) {
  const [open, setOpen] = useState(false);
  const updateMontagem = useUpdateMontagem(montagemId);

  const totalVagas = vagas.reduce((soma, v) => soma + v.quantidadeCasais + v.quantidadeRapazes + v.quantidadeMocas, 0);
  const confirmadas = alocacoes.filter((a) => a.status === 'ACEITO').length;
  const completo = totalVagas > 0 && confirmadas >= totalVagas;

  async function finalizar() {
    try {
      await updateMontagem.mutateAsync({ status: 'FINALIZADA' });
      toast.success('Montagem finalizada.');
      setOpen(false);
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

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar montagem?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmadas} de {totalVagas} vagas confirmadas (aceitas)
              {!completo && ' — ainda falta gente confirmar'}. Depois de finalizada, a distribuição
              vira somente leitura e o histórico de substituição deste encontro deixa de aparecer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={finalizar}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
