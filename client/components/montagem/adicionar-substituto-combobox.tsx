'use client';

import { useState } from 'react';
import { Plus, Users2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { useCandidatosJovensGeral, useCreateListaSubstituicaoItem } from '@/lib/hooks/use-montagens';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';

interface PessoaSelecionada {
  id: string;
  nome: string;
  tipoPessoa: 'JOVEM' | 'CASAL';
  fotoUrl?: string | null;
}

function iniciais(nome: string) {
  return nome.slice(0, 2).toUpperCase();
}

// Adiciona alguém ao banco geral de backups da montagem — não é preso a uma vaga (ver
// docs/ux-e-fluxos.md, seção 3, "Lista de substituição"). Dois passos: escolher a pessoa
// (busca separada por Jovens/Casais, com foto pra reconhecimento rápido), depois (opcional)
// registrar o porquê ("já serviu bem em várias equipes", etc.).
export function AdicionarSubstitutoCombobox({ montagemId, idsJaNaLista }: { montagemId: string; idsJaNaLista: Set<string> }) {
  const [open, setOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<PessoaSelecionada | null>(null);
  const [nota, setNota] = useState('');

  const createItem = useCreateListaSubstituicaoItem(montagemId);
  const jovens = useCandidatosJovensGeral(montagemId);
  const casais = useFichasCasais({ paroquiaId: PAROQUIA_ID_PROVISORIA, situacao: 'ATIVA', pageSize: 200 });

  const opcoesJovens: PessoaSelecionada[] = (jovens.data ?? [])
    .filter((f) => !idsJaNaLista.has(f.id))
    .map((f) => ({ id: f.id, nome: f.nomeCompleto, tipoPessoa: 'JOVEM' as const, fotoUrl: f.fotoUrl }));

  const opcoesCasais: PessoaSelecionada[] = (casais.data?.items ?? [])
    .filter((c) => !idsJaNaLista.has(c.id))
    .map((c) => ({ id: c.id, nome: `${c.nomeEle} e ${c.nomeEla}`, tipoPessoa: 'CASAL' as const, fotoUrl: c.fotoUrl }));

  function fechar() {
    setOpen(false);
    setSelecionada(null);
    setNota('');
  }

  async function confirmar() {
    if (!selecionada) return;
    try {
      await createItem.mutateAsync({
        tipoPessoa: selecionada.tipoPessoa,
        ...(selecionada.tipoPessoa === 'JOVEM' ? { fichaId: selecionada.id } : { fichaCasalId: selecionada.id }),
        ...(nota.trim() && { nota: nota.trim() }),
      });
      toast.success(`${selecionada.nome} adicionado(a) à lista de substituição.`);
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar.');
    }
  }

  return (
    <Popover open={open} onOpenChange={(v) => (v ? setOpen(true) : fechar())}>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Adicionar à lista
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        {!selecionada ? (
          <Command>
            <CommandInput placeholder="Buscar por nome..." />
            <CommandList className="max-h-[400px]">
              <CommandEmpty>Ninguém encontrado.</CommandEmpty>
              <CommandGroup
                heading={
                  <span className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" /> Jovens
                  </span>
                }
              >
                {opcoesJovens.map((pessoa) => (
                  <CommandItem key={pessoa.id} value={pessoa.nome} onSelect={() => setSelecionada(pessoa)} className="gap-2 py-2">
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
                {opcoesCasais.map((pessoa) => (
                  <CommandItem key={pessoa.id} value={pessoa.nome} onSelect={() => setSelecionada(pessoa)} className="gap-2 py-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={pessoa.fotoUrl ?? undefined} alt={pessoa.nome} />
                      <AvatarFallback className="text-xs">{iniciais(pessoa.nome)}</AvatarFallback>
                    </Avatar>
                    {pessoa.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selecionada.fotoUrl ?? undefined} alt={selecionada.nome} />
                <AvatarFallback>{iniciais(selecionada.nome)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-tight">{selecionada.nome}</p>
                <p className="text-xs text-muted-foreground">{selecionada.tipoPessoa === 'JOVEM' ? 'Jovem' : 'Casal'}</p>
              </div>
            </div>
            <div>
              <Textarea
                placeholder="Por que essa pessoa é uma boa opção? (opcional) Ex.: já serviu bem em várias equipes, disponibilidade confirmada..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="text-sm"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelecionada(null)}>
                Voltar
              </Button>
              <Button size="sm" onClick={confirmar} disabled={createItem.isPending}>
                Adicionar à lista
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
