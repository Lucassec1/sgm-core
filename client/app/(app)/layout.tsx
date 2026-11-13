'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/loading-screen';
import { useSessao } from '@/lib/auth-context';
import { AtuandoBanner } from '@/components/atuando-banner';

// Grupo (app) = área de conta PAROQUIA (Fichas + Montagem) — Conselho não acessa Fichas
// (R8), por isso é redirecionado pra área própria em vez de renderizar aqui.
//
// Checagem de sessão é client-side (não dá pra fazer no servidor/middleware da Vercel): o
// cookie de sessão pertence ao domínio do server (Render), diferente do domínio do client
// (Vercel) — o servidor do Next.js nunca recebe esse cookie, só o navegador consegue mandar
// de volta pro Render numa chamada direta (fetch com credentials: 'include').
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: sessao, isLoading, isError } = useSessao();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !sessao) {
      router.replace('/login');
      return;
    }
    if (sessao.role !== 'PAROQUIA') {
      router.replace('/conselho');
    }
  }, [isLoading, isError, sessao, router]);

  if (isLoading || isError || !sessao || sessao.role !== 'PAROQUIA') {
    return <LoadingScreen />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
            <span className="hidden sm:inline">SGM Core · </span>
            {sessao.atuando?.afilhada.nome ?? sessao.paroquia?.nome ?? 'SGM Core'}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <CommandPalette />
          </div>
        </header>
        <AtuandoBanner />
        <div id="conteudo" className="flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
