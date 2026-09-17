'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from '@/components/ui/sonner';
import { useSessao } from '@/lib/auth-context';

// Grupo (conselho) = área exclusiva de conta CONSELHO (R8) — só leitura de Montagem de
// qualquer paróquia + observações; NÃO reusa a Sidebar do grupo (app) porque essa lista
// Fichas, que o Conselho não pode acessar.
//
// Checagem de sessão client-side — ver comentário equivalente em (app)/layout.tsx sobre por
// que não dá pra fazer isso no servidor quando client e server ficam em domínios diferentes.
export default function ConselhoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: sessao, isLoading, isError } = useSessao();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !sessao) {
      router.replace('/login');
      return;
    }
    if (sessao.role !== 'CONSELHO') {
      router.replace('/');
    }
  }, [isLoading, isError, sessao, router]);

  if (isLoading || isError || !sessao || sessao.role !== 'CONSELHO') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Link href="/conselho" className="text-sm font-medium">
          SGM Core · Conselho
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{sessao.nome}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <Toaster />
    </div>
  );
}
