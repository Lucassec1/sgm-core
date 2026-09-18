'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Image from 'next/image';
import { Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';

// Login único (docs/producao.md, bloqueador #3) — mesmo formulário pra conta de paróquia e de
// Conselho; o backend decide pelo `role` de quem logou, o client só redireciona pro lugar
// certo depois (ver docs/regras-imutaveis.md, R7/R8).
const loginSchema = z.object({
  login: z.string().min(1, 'Informe o usuário'),
  senha: z.string().min(1, 'Informe a senha'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [capsLockAtivo, setCapsLockAtivo] = useState(false);

  // Anima via transição real de estado (opacity/transform mudando depois do mount), não via
  // classe `animate-in` já presente na primeira renderização — a página é pré-renderizada como
  // estática, então uma classe de "entrada" já no HTML inicial não tem nenhuma mudança de
  // estado pra disparar a animação de verdade.
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const checarCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockAtivo(e.getModifierState?.('CapsLock') ?? false);
  };

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const sessao = await apiClient.login(values.login, values.senha);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push(sessao.role === 'CONSELHO' ? '/conselho' : '/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error('Login ou senha inválidos.');
      } else {
        toast.error('Não foi possível entrar. Tente novamente.');
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Painel de identidade — escondido em telas pequenas (o formulário sozinho já basta lá,
          com um logo pequeno no topo). Tom neutro escuro (zinc), não uma cor "de marca" — o
          design system do projeto evita cor institucional de propósito (é um sistema
          operacional, ver docs/design-system.md). */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-zinc-950 p-12 lg:flex">
        <Image
          src="/logo-segue-me.png"
          alt="Segue-me"
          width={160}
          height={160}
          priority
          className="h-40 w-40 object-contain"
        />
        <h1 className="mt-6 text-xl font-semibold text-white">SGM Core</h1>
        <p className="mt-1 text-sm text-zinc-400">Segue-me — Diocese de Crato</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className={`w-full max-w-sm transition-all duration-500 ease-out ${
            visivel ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo-segue-me.png"
              alt="Segue-me"
              width={80}
              height={80}
              priority
              className="h-20 w-20 object-contain"
            />
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold">Entrar</h2>
            <p className="text-sm text-muted-foreground">
              Acesse com sua credencial de paróquia ou do Conselho.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="login">Usuário</Label>
              <Input id="login" autoComplete="username" {...register('login')} />
              {errors.login && <p className="mt-1 text-xs text-red-600">{errors.login.message}</p>}
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
              {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
