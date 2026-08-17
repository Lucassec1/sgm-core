'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { useCandidatosJovensGeral, useCreateListaSubstituicaoItem } from '@/lib/hooks/use-montagens';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';

interface PessoaSelecionada {
  id: string;
  nome: string;
  tipoPessoa: 'JOVEM' | 'CASAL';
}

// Adiciona alguém ao banco geral de backups da montagem — não é preso a uma vaga (ver
// docs/ux-e-fluxos.md, seção 3, "Lista de substituição"). Dois passos: escolher a pessoa,
// depois (opcional) registrar o porquê ("já serviu bem em várias equipes", etc.).
export function AdicionarSubstitutoCombobox({ montagemId, idsJaNaLista }: { montagemId: string; idsJaNaLista: Set<string> }) {
  const [open, setOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<PessoaSelecionada | null>(null);
  const [nota, setNota] = useState('');

  const createItem = useCreateListaSubstituicaoItem(montagemId);
  const jovens = useCandidatosJovensGeral(montagemId);
  const casais = useFichasCasais({ paroquiaId: PAROQUIA_ID_PROVISORIA, situacao: 'ATIVA', pageSize: 200 });

  const opcoes: PessoaSelecionada[] = [
    ...(jovens.data ?? [])
      .filter((f) => !idsJaNaLista.has(f.id))
      .map((f) => ({ id: f.id, nome: f.nomeCompleto, tipoPessoa: 'JOVEM' as const })),
    ...(casais.data?.items ?? [])
      .filter((c) => !idsJaNaLista.has(c.id))
      .map((c) => ({ id: c.id, nome: `${c.nomeEle} e ${c.nomeEla}`, tipoPessoa: 'CASAL' as const })),
  ];

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
      <PopoverContent className="w-96 p-0" align="start">
        {!selecionada ? (
          <Command>
            <CommandInput placeholder="Buscar por nome..." />
            <CommandList className="max-h-[360px]">
              <CommandEmpty>Ninguém encontrado.</CommandEmpty>
              <CommandGroup>
                {opcoes.map((pessoa) => (
                  <CommandItem key={pessoa.id} value={pessoa.nome} onSelect={() => setSelecionada(pessoa)} className="py-2">
                    {pessoa.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="p-3 space-y-2">
            <p className="text-sm font-medium">{selecionada.nome}</p>
            <Textarea
              placeholder="Por que essa pessoa é uma boa opção? (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelecionada(null)}>
                Voltar
              </Button>
              <Button size="sm" onClick={confirmar} disabled={createItem.isPending}>
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
