import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from '@/components/ui/sonner';
import { obterSessaoServidor } from '@/lib/sessao-servidor';

// Grupo (conselho) = área exclusiva de conta CONSELHO (R8) — só leitura de Montagem de
// qualquer paróquia + observações; NÃO reusa a Sidebar do grupo (app) porque essa lista
// Fichas, que o Conselho não pode acessar.
export default async function ConselhoLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoServidor();
  if (!sessao) redirect('/login');
  if (sessao.role !== 'CONSELHO') redirect('/');

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
