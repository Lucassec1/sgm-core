'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

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
import { apiClient, ApiError } from '@/lib/api-client';

// Self-service — a própria conta (paróquia ou Conselho) troca a senha sem depender de um
// reset externo. Útil pra virada de equipe dirigente todo início de ano, por exemplo.
export const trocarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual'),
    senhaNova: z.string().min(8, 'A nova senha precisa ter pelo menos 8 caracteres'),
    confirmarSenha: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.senhaNova === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

type TrocarSenhaFormValues = z.infer<typeof trocarSenhaSchema>;

export function TrocarSenhaDialog() {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrocarSenhaFormValues>({ resolver: zodResolver(trocarSenhaSchema) });

  const onSubmit = async (values: TrocarSenhaFormValues) => {
    try {
      await apiClient.alterarSenha(values.senhaAtual, values.senhaNova);
      toast.success('Senha alterada.');
      setOpen(false);
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error('Senha atual incorreta.');
      } else {
        toast.error('Não foi possível trocar a senha.');
      }
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
        <Button variant="ghost" size="icon" title="Trocar senha" aria-label="Trocar senha">
          <KeyRound className="h-[1.1rem] w-[1.1rem]" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
            <DialogDescription>
              Informe a senha atual e a nova senha (mínimo 8 caracteres).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="senhaAtual">Senha atual</Label>
              <Input
                id="senhaAtual"
                type="password"
                autoComplete="current-password"
                {...register('senhaAtual')}
              />
              {errors.senhaAtual && (
                <p className="mt-1 text-xs text-red-600">{errors.senhaAtual.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="senhaNova">Nova senha</Label>
              <Input
                id="senhaNova"
                type="password"
                autoComplete="new-password"
                {...register('senhaNova')}
              />
              {errors.senhaNova && (
                <p className="mt-1 text-xs text-red-600">{errors.senhaNova.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                autoComplete="new-password"
                {...register('confirmarSenha')}
              />
              {errors.confirmarSenha && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmarSenha.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Trocar senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
