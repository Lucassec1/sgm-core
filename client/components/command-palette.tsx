'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Search, UserRound, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useFichas } from '@/lib/hooks/use-fichas';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import { useMontagens } from '@/lib/hooks/use-montagens';

const MIN_CHARS_BUSCA = 2;
const DEBOUNCE_MS = 200;

// Paleta de comando global (⌘K / Ctrl+K, abre de qualquer tela) — busca fichas, casais e
// montagens por nome/número, e lista ações rápidas. Mesma peça (`Command`) já usada no
// combobox de busca de pessoa pra vaga (docs/design-system.md), só exposta globalmente —
// ver docs/propostas.md, proposta #1. `shouldFilter={false}`: quem filtra os resultados de
// ficha/casal é a API (busca por nome no servidor), não o matching fuzzy do cmdk.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  const buscaAtiva = debounced.length >= MIN_CHARS_BUSCA;

  const fichas = useFichas(
    { nome: debounced, situacao: 'ATIVA', pageSize: 6 },
    { enabled: open && buscaAtiva },
  );
  const casais = useFichasCasais(
    { nome: debounced, situacao: 'ATIVA', pageSize: 6 },
    { enabled: open && buscaAtiva },
  );
  // Montagens não tem busca por nome na API (é só um número de encontro) — busca a lista
  // uma vez que a paleta abre e filtra aqui mesmo; volume é baixo (poucos encontros/ano).
  const montagens = useMontagens({ pageSize: 100 }, { enabled: open });

  const montagemEmAndamento = montagens.data?.items.find((m) => m.status === 'EM_ANDAMENTO');

  const montagensEncontradas = useMemo(() => {
    if (!buscaAtiva) return [];
    return (montagens.data?.items ?? []).filter((m) =>
      String(m.numeroEncontro).includes(debounced),
    );
  }, [montagens.data, debounced, buscaAtiva]);

  function ir(caminho: string) {
    setOpen(false);
    router.push(caminho);
  }

  const acoesRapidas = [
    { label: 'Nova Ficha (Jovem)', Icon: UserRound, onSelect: () => ir('/fichas/novo') },
    { label: 'Novo Casal', Icon: Users, onSelect: () => ir('/fichas/casais/novo') },
    { label: 'Ver Quadro de Equipes', Icon: LayoutGrid, onSelect: () => ir('/montagem') },
    ...(montagemEmAndamento
      ? [
          {
            label: `Ir para Montagem em andamento (nº ${montagemEmAndamento.numeroEncontro})`,
            Icon: LayoutGrid,
            onSelect: () => ir(`/montagem/${montagemEmAndamento.id}`),
          },
        ]
      : []),
  ].filter(
    (acao) => !query.trim() || acao.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        Buscar
        <kbd className="ml-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0">
          <Command
            shouldFilter={false}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          >
            <CommandInput
              placeholder="Buscar ficha, casal, montagem... ou uma ação"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {buscaAtiva ? 'Nada encontrado.' : 'Digite pra buscar, ou escolha uma ação.'}
              </CommandEmpty>

              {acoesRapidas.length > 0 && (
                <CommandGroup heading="Ações rápidas">
                  {acoesRapidas.map((acao) => (
                    <CommandItem key={acao.label} value={acao.label} onSelect={acao.onSelect}>
                      <acao.Icon className="mr-2 h-4 w-4" />
                      {acao.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {buscaAtiva && (fichas.data?.items.length ?? 0) > 0 && (
                <CommandGroup heading="Jovens">
                  {fichas.data!.items.map((f) => (
                    <CommandItem key={f.id} value={f.id} onSelect={() => ir(`/fichas/${f.id}`)}>
                      <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                      {f.nomeCompleto}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {buscaAtiva && (casais.data?.items.length ?? 0) > 0 && (
                <CommandGroup heading="Casais">
                  {casais.data!.items.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={() => ir(`/fichas/casais/${c.id}`)}
                    >
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      {c.nomeEle} e {c.nomeEla}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {montagensEncontradas.length > 0 && (
                <CommandGroup heading="Montagens">
                  {montagensEncontradas.map((m) => (
                    <CommandItem key={m.id} value={m.id} onSelect={() => ir(`/montagem/${m.id}`)}>
                      <LayoutGrid className="mr-2 h-4 w-4 text-muted-foreground" />
                      Encontro nº {m.numeroEncontro}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
