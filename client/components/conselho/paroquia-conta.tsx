'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

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
import {
  useAlterarEmailParoquia,
  useCriarParoquia,
  useRedefinirAcessoParoquia,
} from '@/lib/hooks/use-conselho';

// Gestão das contas de paróquia pelo Conselho (R8): a conta é só o e-mail da paróquia — o
// Conselho nunca define nem vê a senha; a paróquia cria no primeiro acesso, pelo link que o
// sistema manda pra esse e-mail.

export const novaParoquiaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da paróquia'),
  email: z.string().trim().email('E-mail inválido'),
});

const emailSchema = novaParoquiaSchema.pick({ email: true });

function mensagemDeErro(err: unknown, padrao: string) {
  return err instanceof ApiError && err.status === 409 ? err.message : padrao;
}

export function NovaParoquiaDialog() {
  const [open, setOpen] = useState(false);
  const criar = useCriarParoquia();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof novaParoquiaSchema>>({ resolver: zodResolver(novaParoquiaSchema) });

  const onSubmit = async (values: z.infer<typeof novaParoquiaSchema>) => {
    try {
      await criar.mutateAsync(values);
      toast.success(`${values.nome} cadastrada. Avise a paróquia para fazer o primeiro acesso.`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Não foi possível cadastrar a paróquia.'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nova paróquia
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Nova paróquia</DialogTitle>
            <DialogDescription>
              Use o e-mail da paróquia (o mesmo do Drive, por exemplo), não o pessoal de alguém da
              equipe. No primeiro acesso, a paróquia recebe nele um link para criar a senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nomeParoquia">Nome</Label>
              <Input id="nomeParoquia" {...register('nome')} />
              {errors.nome && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.nome.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="emailParoquia">E-mail da paróquia</Label>
              <Input id="emailParoquia" type="email" autoComplete="off" {...register('email')} />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TrocarEmailParoquiaDialog({
  paroquiaId,
  paroquiaNome,
  emailAtual,
}: {
  paroquiaId: string;
  paroquiaNome: string;
  emailAtual: string;
}) {
  const [open, setOpen] = useState(false);
  const alterar = useAlterarEmailParoquia();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });

  const onSubmit = async ({ email }: z.infer<typeof emailSchema>) => {
    try {
      await alterar.mutateAsync({ id: paroquiaId, email });
      toast.success('E-mail atualizado.');
      setOpen(false);
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Não foi possível trocar o e-mail.'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) reset({ email: emailAtual.includes('@') ? emailAtual : '' });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Trocar e-mail
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Trocar e-mail — {paroquiaNome}</DialogTitle>
            <DialogDescription>
              O e-mail novo passa a ser o login da paróquia. A senha atual continua valendo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor={`email-${paroquiaId}`}>E-mail da paróquia</Label>
            <Input
              id={`email-${paroquiaId}`}
              type="email"
              autoComplete="off"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RedefinirAcessoButton({
  paroquiaId,
  paroquiaNome,
}: {
  paroquiaId: string;
  paroquiaNome: string;
}) {
  const redefinir = useRedefinirAcessoParoquia();

  const confirmar = async () => {
    try {
      await redefinir.mutateAsync(paroquiaId);
      toast.success(`Acesso de ${paroquiaNome} redefinido.`);
    } catch {
      toast.error('Não foi possível redefinir o acesso.');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Redefinir acesso
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Redefinir acesso de {paroquiaNome}?</AlertDialogTitle>
          <AlertDialogDescription>
            A senha atual deixa de valer e quem estiver logado é desconectado. A paróquia volta ao
            primeiro acesso: entra com o e-mail e recebe um link para criar a senha nova. Use na
            virada de equipe ou se a senha tiver vazado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar}>Redefinir acesso</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
