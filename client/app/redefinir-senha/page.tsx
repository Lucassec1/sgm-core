'use client';

import { useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  redefinirSenhaSchema,
  tokenDoFragmento,
  type RedefinirSenhaFormValues,
} from './redefinir-senha-schema';

function assinarHash(aoMudar: () => void) {
  window.addEventListener('hashchange', aoMudar);
  return () => window.removeEventListener('hashchange', aoMudar);
}

// Destino do link do e-mail (/redefinir-senha#token=...). Depois de trocar, manda pro login —
// não loga automaticamente: quem abriu o link confirma que sabe a senha nova entrando com ela.
export default function RedefinirSenhaPage() {
  const router = useRouter();
  // O fragmento só existe no navegador: no pré-render o snapshot é null (token undefined =
  // "ainda lendo"); no navegador, null = link sem token.
  const hash = useSyncExternalStore(
    assinarHash,
    () => window.location.hash,
    () => null,
  );
  const token = hash === null ? undefined : tokenDoFragmento(hash);
  const [linkInvalido, setLinkInvalido] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RedefinirSenhaFormValues>({ resolver: zodResolver(redefinirSenhaSchema) });

  const onSubmit = async (values: RedefinirSenhaFormValues) => {
    if (!token) return;
    try {
      await apiClient.redefinirSenha(token, values.senhaNova);
      toast.success('Senha redefinida. Entre com a senha nova.');
      router.replace('/login');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setLinkInvalido(true);
      } else {
        toast.error('Não foi possível redefinir a senha. Tente de novo.');
      }
    }
  };

  if (token === undefined) return <AuthLayout>{null}</AuthLayout>;

  if (token === null || linkInvalido) {
    return (
      <AuthLayout>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Link inválido ou expirado</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O link vale por 30 minutos e só pode ser usado uma vez. Peça um novo.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/esqueci-senha">Pedir novo link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Criar senha nova</h2>
        <p className="text-sm text-muted-foreground">
          Mínimo de 8 caracteres. Quem estiver logado com a senha antiga será desconectado.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="senhaNova">Nova senha</Label>
          <Input
            id="senhaNova"
            type="password"
            autoComplete="new-password"
            autoFocus
            {...register('senhaNova')}
          />
          {errors.senhaNova && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.senhaNova.message}
            </p>
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
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.confirmarSenha.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Redefinir senha
        </Button>
      </form>
    </AuthLayout>
  );
}
