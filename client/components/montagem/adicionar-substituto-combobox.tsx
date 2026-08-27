'use client';

import { useState } from 'react';
import { Users2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { useCandidatosJovensGeral, useCreateListaSubstituicaoItem } from '@/lib/hooks/use-montagens';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';

interface PessoaOpcao {
  id: string;
  nome: string;
  tipoPessoa: 'JOVEM' | 'CASAL';
  fotoUrl?: string | null;
}

function iniciais(nome: string) {
  return nome.slice(0, 2).toUpperCase();
}

// Barra de busca fixa no topo da aba Substituições — sempre visível, largura cheia, sem
// popover flutuante. Clicar numa pessoa já a adiciona ao banco geral de backups (ver
// docs/ux-e-fluxos.md, seção 3, "Lista de substituição"): um clique, sem passo de
// confirmação. A lista não é presa a nenhuma vaga.
export function AdicionarSubstitutoBar({
  montagemId,
  idsJaNaLista,
  idsNoEncontro,
}: {
  montagemId: string;
  /** já estão na lista de substituição */
  idsJaNaLista: Set<string>;
  /** já estão escalados no encontro (ou recusaram/desistiram) — não são opção de substituição */
  idsNoEncontro: Set<string>;
}) {
  const [busca, setBusca] = useState('');
  const [focado, setFocado] = useState(false);

  const createItem = useCreateListaSubstituicaoItem(montagemId);
  const jovens = useCandidatosJovensGeral(montagemId);
  const casais = useFichasCasais({ paroquiaId: PAROQUIA_ID_PROVISORIA, situacao: 'ATIVA', pageSize: 200 });

  const disponivel = (id: string) => !idsJaNaLista.has(id) && !idsNoEncontro.has(id);

  const opcoesJovens: PessoaOpcao[] = (jovens.data ?? [])
    .filter((f) => disponivel(f.id))
    .map((f) => ({ id: f.id, nome: f.nomeCompleto, tipoPessoa: 'JOVEM' as const, fotoUrl: f.fotoUrl }));

  const opcoesCasais: PessoaOpcao[] = (casais.data?.items ?? [])
    .filter((c) => disponivel(c.id))
    .map((c) => ({ id: c.id, nome: `${c.nomeEle} e ${c.nomeEla}`, tipoPessoa: 'CASAL' as const, fotoUrl: c.fotoUrl }));

  async function adicionar(pessoa: PessoaOpcao) {
    try {
      await createItem.mutateAsync({
        tipoPessoa: pessoa.tipoPessoa,
        ...(pessoa.tipoPessoa === 'JOVEM' ? { fichaId: pessoa.id } : { fichaCasalId: pessoa.id }),
      });
      toast.success(`${pessoa.nome} adicionado(a) à lista.`);
      setBusca('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar.');
    }
  }

  // Sem busca: mostra alguns nomes já de cara (jovens já vêm ordenados por prioridade R5),
  // pra não ficar um campo vazio. Com busca: lista completa, o cmdk filtra.
  const temBusca = busca.trim().length > 0;
  const LIMITE_SUGESTOES = 6;
  const jovensExibidos = temBusca ? opcoesJovens : opcoesJovens.slice(0, LIMITE_SUGESTOES);
  const casaisExibidos = temBusca ? opcoesCasais : opcoesCasais.slice(0, LIMITE_SUGESTOES);
  const carregando = jovens.isLoading || casais.isLoading;
  // Só aparece enquanto a barra está focada — clicar fora fecha (o texto digitado
  // permanece; focar de novo mostra os resultados filtrados).
  const aberto = focado;

  return (
    <Command className="rounded-md border shadow-sm">
      <CommandInput
        placeholder="Buscar jovem ou casal para adicionar à lista..."
        value={busca}
        onValueChange={setBusca}
        onFocus={() => setFocado(true)}
        // pequeno atraso pro clique num item registrar antes da lista sumir
        onBlur={() => setTimeout(() => setFocado(false), 150)}
      />
      {aberto && (
      <CommandList className="max-h-72">
        {carregando ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <CommandEmpty>Ninguém encontrado.</CommandEmpty>
            {!temBusca && (jovensExibidos.length > 0 || casaisExibidos.length > 0) && (
              <p className="px-3 pt-2 text-xs text-muted-foreground">Sugestões — digite pra buscar todos</p>
            )}
            <CommandGroup
              heading={
                <span className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" /> Jovens
                </span>
              }
            >
              {jovensExibidos.map((pessoa) => (
                <CommandItem
                  key={pessoa.id}
                  value={pessoa.nome}
                  onSelect={() => adicionar(pessoa)}
                  className="gap-2 py-2"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={pessoa.fotoUrl ?? undefined} alt={pessoa.nome} />
                    <AvatarFallback className="text-xs">{iniciais(pessoa.nome)}</AvatarFallback>
                  </Avatar>
                  {pessoa.nome}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup
              heading={
                <span className="flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" /> Casais
                </span>
              }
            >
              {casaisExibidos.map((pessoa) => (
                <CommandItem
                  key={pessoa.id}
                  value={pessoa.nome}
                  onSelect={() => adicionar(pessoa)}
                  className="gap-2 py-2"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={pessoa.fotoUrl ?? undefined} alt={pessoa.nome} />
                    <AvatarFallback className="text-xs">{iniciais(pessoa.nome)}</AvatarFallback>
                  </Avatar>
                  {pessoa.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      )}
    </Command>
  );
}
