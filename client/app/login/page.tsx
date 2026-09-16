'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

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
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>SGM Core</CardTitle>
          <CardDescription>Segue-me — diocese de Crato</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="login">Usuário</Label>
              <Input id="login" autoComplete="username" {...register('login')} />
              {errors.login && <p className="mt-1 text-xs text-red-600">{errors.login.message}</p>}
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                {...register('senha')}
              />
              {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
