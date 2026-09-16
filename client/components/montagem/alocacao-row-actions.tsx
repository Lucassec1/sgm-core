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
// 1.2 "Controle de Convites"). Tanto recusa quanto desistência exigem registrar o motivo
// da saída — fica no histórico da ficha e na aba Convites do encontro. R1 bloqueia a
// pessoa no resto do encontro assim que qualquer um dos dois é registrado (backend).
export function AlocacaoRowActions({
  montagemId,
  alocacao,
}: {
  montagemId: string;
  alocacao: Alocacao;
}) {
  const [saidaAberta, setSaidaAberta] = useState<null | 'RECUSADO' | 'DESISTIU'>(null);
  const [motivo, setMotivo] = useState('');
  const updateAlocacao = useUpdateAlocacao(montagemId);

  async function mudarStatus(status: 'ACEITO' | 'RECUSADO' | 'DESISTIU', motivoRecusa?: string) {
    try {
      await updateAlocacao.mutateAsync({
        id: alocacao.id,
        status,
        ...(motivoRecusa && { motivoRecusa }),
      });
      toast.success('Status atualizado.');
      setSaidaAberta(null);
      setMotivo('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar o status.');
    }
  }

  const dialogoMotivo = (
    <AlertDialog open={saidaAberta !== null} onOpenChange={(v) => !v && setSaidaAberta(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {saidaAberta === 'DESISTIU' ? 'Registrar desistência' : 'Registrar recusa'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Essa pessoa fica bloqueada pro restante deste encontro (R1) — só pode ser convidada de
            novo no próximo. O motivo aparece no histórico da ficha e na aba Convites.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Motivo da saída"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={updateAlocacao.isPending}
            onClick={() => saidaAberta && mudarStatus(saidaAberta, motivo.trim() || undefined)}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (alocacao.status === 'CONVIDADO') {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => mudarStatus('ACEITO')}
        >
          Aceitar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => setSaidaAberta('RECUSADO')}
        >
          Recusar
        </Button>
        {dialogoMotivo}
      </div>
    );
  }

  if (alocacao.status === 'ACEITO') {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => setSaidaAberta('DESISTIU')}
        >
          Desistiu
        </Button>
        {dialogoMotivo}
      </>
    );
  }

  return null;
}
