'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import type { AcaoImplantacao, ImplantacaoConselho } from '@/lib/api/conselho';
import { useAvancarImplantacao, useLiberarAcessoAfilhada } from '@/lib/hooks/use-implantacoes';

// Próxima fase de cada vínculo e o que ela muda — o texto vai no diálogo de confirmação.
function proximaFase(
  i: ImplantacaoConselho,
): { acao: AcaoImplantacao; rotulo: string; efeito: string } | null {
  switch (i.fase) {
    case 'SEMENTEIRA':
      return {
        acao: 'iniciar',
        rotulo: 'Iniciar implantação',
        efeito: `${i.fichasSementeira} ${i.fichasSementeira === 1 ? 'ficha de sementeira passa' : 'fichas de sementeira passam'} para ${i.afilhada.nome}. A partir daqui, ${i.madrinha.nome} pode atuar por ela e os encontros 1 a 3 seguem os Anexos I a III.`,
      };
    case 'IMPLANTACAO':
      return {
        acao: 'acompanhamento',
        rotulo: 'Passar para acompanhamento',
        efeito: `${i.afilhada.nome} assume o controle. ${i.madrinha.nome} deixa de atuar por ela e só libera fichas pontuais quando precisar.`,
      };
    case 'ACOMPANHAMENTO':
      return {
        acao: 'encerrar',
        rotulo: 'Encerrar',
        efeito: `O vínculo termina: ${i.afilhada.nome} e ${i.madrinha.nome} ficam totalmente separadas, como qualquer paróquia. Não dá para reabrir.`,
      };
    default:
      return null;
  }
}

export function AvancarFaseButton({ implantacao }: { implantacao: ImplantacaoConselho }) {
  const avancar = useAvancarImplantacao();
  const proxima = proximaFase(implantacao);
  if (!proxima) return null;

  const confirmar = async () => {
    try {
      await avancar.mutateAsync({ id: implantacao.id, acao: proxima.acao });
      toast.success('Fase atualizada.');
    } catch {
      toast.error('Não foi possível mudar a fase.');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          {proxima.rotulo}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {proxima.rotulo}: {implantacao.afilhada.nome}?
          </AlertDialogTitle>
          <AlertDialogDescription>{proxima.efeito}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// A conta da afilhada sai para o II encontro, quando a equipe dirigente dela é formada.
export function LiberarAcessoDialog({ implantacao }: { implantacao: ImplantacaoConselho }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const liberar = useLiberarAcessoAfilhada();

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await liberar.mutateAsync({ id: implantacao.id, email: email.trim() });
      toast.success(
        `Acesso liberado. Avise ${implantacao.afilhada.nome} para fazer o primeiro acesso.`,
      );
      setOpen(false);
      setEmail('');
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 409
          ? err.message
          : 'Não foi possível liberar o acesso.',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Liberar acesso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={enviar}>
          <DialogHeader>
            <DialogTitle>Liberar acesso de {implantacao.afilhada.nome}</DialogTitle>
            <DialogDescription>
              Use o e-mail da paróquia. No primeiro acesso, ela recebe nele um link para criar a
              senha.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="emailAfilhada">E-mail da paróquia</Label>
            <Input
              id="emailAfilhada"
              type="email"
              autoComplete="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={liberar.isPending}>
              Liberar acesso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
