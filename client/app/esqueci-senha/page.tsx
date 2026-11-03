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

const esqueciSenhaSchema = z.object({ login: z.string().trim().min(1, 'Informe o usuário') });
type EsqueciSenhaFormValues = z.infer<typeof esqueciSenhaSchema>;

// Pede o link de redefinição. A mensagem de sucesso é a mesma exista o login ou não, tenha
// e-mail cadastrado ou não — o server não revela isso (ver AuthService.solicitarRedefinicao).
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
            <h2 className="text-lg font-semibold">Confira o e-mail</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Se esse usuário tiver um e-mail de recuperação cadastrado, enviamos um link para criar
              uma senha nova. Ele vale por 30 minutos.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Não chegou? Olhe a caixa de spam. Se a conta não tiver e-mail cadastrado, peça ao
              Conselho para redefinir a senha.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Voltar para o login</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Esqueceu a senha?</h2>
            <p className="text-sm text-muted-foreground">
              Informe o usuário. Mandamos um link para o e-mail de recuperação da conta.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="login">Usuário</Label>
              <Input id="login" autoComplete="username" autoFocus {...register('login')} />
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
