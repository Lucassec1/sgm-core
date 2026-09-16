'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { ApiError } from '@/lib/api-client';
import { useCreateAlocacao } from '@/lib/hooks/use-montagens';
import type { Alocacao, ListaSubstituicaoItem, VagaMontagem } from '@/lib/types';

const STATUS_ATIVO = ['RASCUNHO', 'CONVIDADO', 'ACEITO'];

// Aloca alguém da lista de substituição direto numa vaga em aberto, sem trocar de aba
// (ver docs/ux-e-fluxos.md, seção 3). Só mostra vagas compatíveis com a pessoa (tipo e,
// pra jovem, sexo) e que ainda têm folga. Vagas de Coordenação ficam de fora daqui — a
// escolha de coordenador passa pela regra R3 e é feita pela Lista completa/Drawer.
export function AlocarSubstitutoCombobox({
  montagemId,
  item,
  vagas,
  alocacoes,
}: {
  montagemId: string;
  item: ListaSubstituicaoItem;
  vagas: VagaMontagem[];
  alocacoes: Alocacao[];
}) {
  const [open, setOpen] = useState(false);
  const createAlocacao = useCreateAlocacao(montagemId);

  const sexo = item.ficha?.sexo;

  const ativasDaVaga = (vagaId: string) =>
    alocacoes.filter((a) => a.vagaMontagemId === vagaId && STATUS_ATIVO.includes(a.status));

  const opcoes = vagas
    .filter((v) => !v.cargo.ehCoordenacao)
    .map((v) => {
      const ativas = ativasDaVaga(v.id);
      if (item.tipoPessoa === 'CASAL') {
        const falta = v.quantidadeCasais - ativas.filter((a) => a.tipoPessoa === 'CASAL').length;
        return { vaga: v, falta };
      }
      // jovem: folga é por sexo
      const cota = sexo === 'MOCA' ? v.quantidadeMocas : v.quantidadeRapazes;
      const ocupadasMesmoSexo = ativas.filter((a) => a.ficha?.sexo === sexo).length;
      return { vaga: v, falta: cota - ocupadasMesmoSexo };
    })
    .filter((o) => o.falta > 0)
    .sort(
      (a, b) =>
        a.vaga.equipe.ordem - b.vaga.equipe.ordem || a.vaga.cargo.ordem - b.vaga.cargo.ordem,
    );

  async function alocar(vaga: VagaMontagem) {
    try {
      await createAlocacao.mutateAsync({
        vagaMontagemId: vaga.id,
        tipoPessoa: item.tipoPessoa,
        ...(item.fichaId
          ? { fichaId: item.fichaId }
          : { fichaCasalId: item.fichaCasalId ?? undefined }),
        status: 'CONVIDADO',
      });
      toast.success(`Alocado em ${vaga.equipe.nome} · ${vaga.cargo.nome}.`);
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          'Já serviu nessa equipe antes — aloque pela Lista completa pra confirmar a repetição (R2).',
        );
        setOpen(false);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Não foi possível alocar.');
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
          <UserPlus className="h-3.5 w-3.5" />
          Alocar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Vaga em aberto..." />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhuma vaga em aberto compatível.</CommandEmpty>
            <CommandGroup>
              {opcoes.map(({ vaga, falta }) => (
                <CommandItem
                  key={vaga.id}
                  value={`${vaga.equipe.nome} ${vaga.cargo.nome}`}
                  onSelect={() => alocar(vaga)}
                  className="gap-2 py-2"
                >
                  <EquipeIcon slug={vaga.equipe.slug} nome={vaga.equipe.nome} size={18} />
                  <span className="flex-1">
                    {vaga.equipe.nome}{' '}
                    <span className="text-muted-foreground">· {vaga.cargo.nome}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">faltam {falta}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
