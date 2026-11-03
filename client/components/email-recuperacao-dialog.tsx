'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
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
import { useSessao } from '@/lib/auth-context';

export const emailRecuperacaoSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
});

type EmailRecuperacaoFormValues = z.infer<typeof emailRecuperacaoSchema>;

// E-mail que recebe o link de "Esqueceu a senha?" (tela de login). Ponto âmbar no ícone
// enquanto a conta não tiver um — sem ele, só o Conselho consegue redefinir a senha.
export function EmailRecuperacaoDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: sessao } = useSessao();
  const emailAtual = sessao?.emailRecuperacao ?? null;
  const ehParoquia = sessao?.role === 'PAROQUIA';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailRecuperacaoFormValues>({ resolver: zodResolver(emailRecuperacaoSchema) });

  const onSubmit = async (values: EmailRecuperacaoFormValues) => {
    try {
      await apiClient.alterarEmailRecuperacao(values.senhaAtual, values.email);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('E-mail de recuperação salvo.');
      setOpen(false);
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error('Senha atual incorreta.');
      } else {
        toast.error('Não foi possível salvar o e-mail.');
      }
    }
  };

  const titulo = emailAtual ? 'E-mail de recuperação' : 'Cadastre um e-mail de recuperação';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) reset({ email: emailAtual ?? '', senhaAtual: '' });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title={titulo} aria-label={titulo} className="relative">
          <Mail className="h-[1.1rem] w-[1.1rem]" />
          {!emailAtual && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>E-mail de recuperação</DialogTitle>
            <DialogDescription>
              Recebe o link de &quot;Esqueceu a senha?&quot; da tela de login.
              {ehParoquia &&
                ' Use um e-mail da paróquia (secretaria, por exemplo), não o pessoal de alguém da equipe — quem sair da equipe dirigente não pode continuar recebendo esse link.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="emailRecuperacao">E-mail</Label>
              <Input
                id="emailRecuperacao"
                type="email"
                autoComplete="email"
                placeholder="secretaria@paroquia.org"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="senhaAtualEmail">Senha atual</Label>
              <Input
                id="senhaAtualEmail"
                type="password"
                autoComplete="current-password"
                {...register('senhaAtual')}
              />
              {errors.senhaAtual && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.senhaAtual.message}
                </p>
              )}
            </div>
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
