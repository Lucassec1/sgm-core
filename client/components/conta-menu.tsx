'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { ArrowLeftRight, ChevronsUpDown, KeyRound, LogOut } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { TrocarSenhaDialog } from '@/components/trocar-senha-dialog';
import { useAtuar, useLogout, useSessao } from '@/lib/auth-context';
import { iniciais } from '@/lib/utils';

const TEMAS = [
  { valor: 'light', rotulo: 'Claro' },
  { valor: 'dark', rotulo: 'Escuro' },
  { valor: 'system', rotulo: 'Automático' },
] as const;

// Menu da conta — tudo que é "da conta" num lugar só: trocar senha, tema e sair. Fica no rodapé
// da barra lateral (área da paróquia) e no canto do cabeçalho (área do Conselho, sem barra).
export function ContaMenu({ variante }: { variante: 'barra-lateral' | 'cabecalho' }) {
  const { data: sessao } = useSessao();
  const { theme, setTheme } = useTheme();
  const logout = useLogout();
  const atuar = useAtuar();
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  if (!sessao) return null;
  const nome = sessao.paroquia?.nome ?? sessao.nome ?? 'Conselho';
  const avatar = (
    <Avatar className="h-8 w-8 rounded-lg">
      <AvatarFallback className="rounded-lg text-xs font-bold">{iniciais(nome)}</AvatarFallback>
    </Avatar>
  );
  const identificacao = (
    <span className="grid min-w-0 flex-1 text-left leading-tight">
      <span className="truncate text-sm font-bold">{nome}</span>
      <span className="truncate text-xs text-muted-foreground">{sessao.login}</span>
    </span>
  );

  const menu = (
    <DropdownMenuContent
      align="end"
      side={variante === 'barra-lateral' ? 'top' : 'bottom'}
      className="w-60"
    >
      <DropdownMenuLabel className="flex items-center gap-2 font-normal">
        {avatar}
        {identificacao}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {sessao.atuando ? (
        // Atuando pela afilhada: a conta é da madrinha — senha só se troca de volta nela.
        <DropdownMenuItem onSelect={() => atuar.mutate(null)} disabled={atuar.isPending}>
          <ArrowLeftRight aria-hidden />
          Voltar para {sessao.paroquia?.nome}
        </DropdownMenuItem>
      ) : (
        <>
          {sessao.podeAtuarEm?.map((a) => (
            <DropdownMenuItem
              key={a.implantacaoId}
              onSelect={() => atuar.mutate(a.implantacaoId)}
              disabled={atuar.isPending}
            >
              <ArrowLeftRight aria-hidden />
              Atuar como {a.afilhada.nome}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => setTrocandoSenha(true)}>
            <KeyRound aria-hidden />
            Trocar senha
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="pb-1 text-xs text-muted-foreground">Tema</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
        {TEMAS.map((t) => (
          <DropdownMenuRadioItem key={t.valor} value={t.valor}>
            {t.rotulo}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
        <LogOut aria-hidden />
        Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <>
      {variante === 'barra-lateral' ? (
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={nome}
                  aria-label={`Conta: ${nome}`}
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  {avatar}
                  {identificacao}
                  <ChevronsUpDown className="ml-auto size-4" aria-hidden />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              {menu}
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      ) : (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2" aria-label={`Conta: ${nome}`}>
              {avatar}
              <span className="hidden max-w-40 truncate text-sm font-bold sm:inline">{nome}</span>
              <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          {menu}
        </DropdownMenu>
      )}
      <TrocarSenhaDialog open={trocandoSenha} onOpenChange={setTrocandoSenha} />
    </>
  );
}
