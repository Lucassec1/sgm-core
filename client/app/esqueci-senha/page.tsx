'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';

import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';

const esqueciSenhaSchema = z.object({ login: z.string().trim().min(1, 'Informe o e-mail') });
type EsqueciSenhaFormValues = z.infer<typeof esqueciSenhaSchema>;

// Pede o link de criar senha (primeiro acesso) ou de redefinir (esqueceu) — o mesmo link serve
// pros dois. A mensagem de sucesso é a mesma exista a conta ou não: o server não revela quais
// e-mails estão cadastrados (ver AuthService.solicitarLink).
export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EsqueciSenhaFormValues>({ resolver: zodResolver(esqueciSenhaSchema) });

  const onSubmit = async (values: EsqueciSenhaFormValues) => {
    try {
      await apiClient.esqueciSenha(values.login);
      setEnviado(true);
    } catch {
      toast.error('Não foi possível enviar agora. Tente de novo em alguns minutos.');
    }
  };

  return (
    <AuthLayout>
      {enviado ? (
        <div className="space-y-4">
          <MailCheck className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Confira o e-mail</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Se esse e-mail estiver cadastrado no sistema, enviamos um link para criar a senha. Ele
              vale por 30 minutos.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Não chegou? Olhe a caixa de spam. Se ainda assim não chegar, confira com o Conselho se
              o e-mail cadastrado para a sua paróquia é esse.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Voltar para o login</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Criar ou redefinir senha</h1>
            <p className="text-sm text-muted-foreground">
              Primeiro acesso ou esqueceu a senha? Informe o e-mail da conta e mandamos um link para
              criar a senha.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="login">E-mail</Label>
              <Input
                id="login"
                inputMode="email"
                autoComplete="username"
                placeholder="email@daparoquia.com"
                autoFocus
                {...register('login')}
              />
              {errors.login && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.login.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar link
            </Button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar para o login
            </Link>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
