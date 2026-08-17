'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { useUpdateAlocacao } from '@/lib/hooks/use-montagens';
import type { Alocacao } from '@/lib/types';

// Transições de status por convite (fora de RASCUNHO/CONVIDADO, ver docs/ux-e-fluxos.md,
// 1.2 "Controle de Convites"). Recusa exige motivo — R1 bloqueia a pessoa no resto do
// encontro assim que o motivo é registrado (aplicado pelo backend, não aqui).
export function AlocacaoRowActions({ montagemId, alocacao }: { montagemId: string; alocacao: Alocacao }) {
  const [motivoRecusaOpen, setMotivoRecusaOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const updateAlocacao = useUpdateAlocacao(montagemId);

  async function mudarStatus(status: 'ACEITO' | 'RECUSADO' | 'DESISTIU', motivoRecusa?: string) {
    try {
      await updateAlocacao.mutateAsync({ id: alocacao.id, status, ...(motivoRecusa && { motivoRecusa }) });
      toast.success('Status atualizado.');
      setMotivoRecusaOpen(false);
      setMotivo('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar o status.');
    }
  }

  if (alocacao.status === 'CONVIDADO') {
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => mudarStatus('ACEITO')}>
          Aceitar
        </Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setMotivoRecusaOpen(true)}>
          Recusar
        </Button>

        <AlertDialog open={motivoRecusaOpen} onOpenChange={setMotivoRecusaOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Registrar recusa</AlertDialogTitle>
              <AlertDialogDescription>
                Essa pessoa fica bloqueada pro restante deste encontro (R1) — só pode ser convidada de novo no próximo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => mudarStatus('RECUSADO', motivo || undefined)}>Confirmar recusa</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (alocacao.status === 'ACEITO') {
    return (
      <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => mudarStatus('DESISTIU')}>
        Desistiu
      </Button>
    );
  }

  return null;
}
