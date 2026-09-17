'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { LogoutButton } from '@/components/logout-button';
import { useSessao } from '@/lib/auth-context';

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
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            SGM Core {sessao.paroquia && `· ${sessao.paroquia.nome}`}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <CommandPalette />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
