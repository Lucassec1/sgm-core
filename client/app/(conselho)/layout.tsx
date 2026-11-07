'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/loading-screen';
import { useSessao } from '@/lib/auth-context';
import { ContaMenu } from '@/components/conta-menu';

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
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Link href="/conselho" className="min-w-0 truncate text-sm font-medium">
          <span className="hidden sm:inline">SGM Core · </span>Conselho
        </Link>
        <div className="ml-auto flex shrink-0 items-center">
          <ContaMenu variante="cabecalho" />
        </div>
      </header>
      <main id="conteudo" className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
