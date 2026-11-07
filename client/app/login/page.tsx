'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, AlertTriangle, Loader2, MailCheck } from 'lucide-react';

import { AuthLayout } from '@/components/auth-layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { useSessao } from '@/lib/auth-context';
import { loginSchema, type LoginFormValues } from './login-schema';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [capsLockAtivo, setCapsLockAtivo] = useState(false);
  // E-mail pro qual o server mandou o link de criar senha (conta em primeiro acesso)
  const [linkEnviadoPara, setLinkEnviadoPara] = useState<string | null>(null);

  // Já logado e caiu em /login por engano (link salvo, aba antiga, etc.) — manda direto pro
  // lugar certo em vez de mostrar o formulário de novo. Não desloga nada, só redireciona.
  const { data: sessaoAtual, isLoading: carregandoSessao } = useSessao();
  useEffect(() => {
    if (sessaoAtual) {
      router.replace(sessaoAtual.role === 'CONSELHO' ? '/conselho' : '/');
    }
  }, [sessaoAtual, router]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', senha: '' },
  });

  const checarCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockAtivo(e.getModifierState?.('CapsLock') ?? false);
  };

  // Enquanto checa se já tem sessão (ou já achou e está redirecionando), não mostra o
  // formulário — evita o "flash" do login antes do redirect.
  if (carregandoSessao || sessaoAtual) {
    return <div className="dark min-h-screen bg-background" />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setLinkEnviadoPara(null);
    try {
      const sessao = await apiClient.login(values.login, values.senha);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push(sessao.role === 'CONSELHO' ? '/conselho' : '/');
    } catch (err) {
      const codigo =
        (err instanceof ApiError && (err.body as { code?: string } | null)?.code) || null;
      if (codigo === 'PRIMEIRO_ACESSO') {
        setLinkEnviadoPara(values.login);
      } else if (err instanceof ApiError && err.status === 401) {
        if (!values.senha) setError('senha', { message: 'Informe a senha' });
        else toast.error('E-mail ou senha inválidos.');
      } else {
        toast.error('Não foi possível entrar. Tente novamente.');
      }
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Acesse com sua credencial de paróquia ou do Conselho.
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
            {...register('login')}
          />
          {errors.login && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.login.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="senha">Senha</Label>
          <div className="relative">
            <Input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-9"
              onKeyDown={checarCapsLock}
              onKeyUp={checarCapsLock}
              {...register('senha')}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {capsLockAtivo && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Caps Lock ativado
            </p>
          )}
          {errors.senha && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.senha.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Entrar
        </Button>
        {linkEnviadoPara && (
          <div
            role="status"
            className="flex gap-2 rounded-md border px-3 py-2.5 text-sm text-muted-foreground"
          >
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <p>
              <span className="font-medium text-foreground">Primeiro acesso.</span> Enviamos um link
              para <span className="text-foreground">{linkEnviadoPara}</span> para você criar a
              senha. Ele vale por 30 minutos — se não chegar, olhe o spam.
            </p>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">
          <Link
            href="/esqueci-senha"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Primeiro acesso ou esqueceu a senha?
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
