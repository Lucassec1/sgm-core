import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { LogoutButton } from '@/components/logout-button';
import { obterSessaoServidor } from '@/lib/sessao-servidor';

// Grupo (app) = área de conta PAROQUIA (Fichas + Montagem) — Conselho não acessa Fichas
// (R8), por isso é redirecionado pra área própria em vez de renderizar aqui.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoServidor();
  if (!sessao) redirect('/login');
  if (sessao.role !== 'PAROQUIA') redirect('/conselho');

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
