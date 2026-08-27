'use client';

import { Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAlocacoes, useDeleteListaSubstituicaoItem, useListaSubstituicao } from '@/lib/hooks/use-montagens';
import { AdicionarSubstitutoBar } from './adicionar-substituto-combobox';
import { PessoaPreviewPopover } from './pessoa-preview-popover';
import type { ListaSubstituicaoItem } from '@/lib/types';

// Quem já está no encontro não é opção de substituição: ou está ocupando uma vaga
// (RASCUNHO/CONVIDADO/ACEITO), ou recusou/desistiu e não pode servir esse encontro (R1).
// Quem foi SUBSTITUIDO saiu da vaga e volta a ficar disponível como backup.
const STATUS_INDISPONIVEL = ['RASCUNHO', 'CONVIDADO', 'ACEITO', 'RECUSADO', 'DESISTIU'];

function nomeItem(item: ListaSubstituicaoItem) {
  return item.ficha?.nomeCompleto ?? (item.fichaCasal ? `${item.fichaCasal.nomeEle} e ${item.fichaCasal.nomeEla}` : '—');
}

function fotoItem(item: ListaSubstituicaoItem) {
  return item.ficha?.fotoUrl ?? item.fichaCasal?.fotoUrl ?? undefined;
}

// Banco geral de backups da montagem (docs/ux-e-fluxos.md, seção 3) — independente de
// vaga/equipe, por encontro. Não carrega automaticamente de um encontro pro outro.
export function ListaSubstituicaoSection({ montagemId }: { montagemId: string }) {
  const { data: itens, isLoading } = useListaSubstituicao(montagemId);
  const { data: alocacoes } = useAlocacoes(montagemId);
  const deleteItem = useDeleteListaSubstituicaoItem(montagemId);

  const idsJaNaLista = new Set((itens ?? []).map((i) => i.fichaId ?? i.fichaCasalId ?? ''));
  const idsNoEncontro = new Set(
    (alocacoes ?? [])
      .filter((a) => STATUS_INDISPONIVEL.includes(a.status))
      .map((a) => a.fichaId ?? a.fichaCasalId ?? ''),
  );

  async function remover(id: string) {
    try {
      await deleteItem.mutateAsync(id);
      toast.success('Removido da lista de substituição.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pessoas cotadas como boa opção de substituição em qualquer equipe — consulte aqui primeiro quando alguém sair de
        uma vaga.
      </p>

      <div className="max-w-xl">
        <AdicionarSubstitutoBar montagemId={montagemId} idsJaNaLista={idsJaNaLista} idsNoEncontro={idsNoEncontro} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {itens && itens.length === 0 && <p className="text-sm text-muted-foreground">Ninguém na lista ainda.</p>}

      {itens && itens.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((item) => (
            <li key={item.id} className="flex items-start gap-3 rounded-md border p-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={fotoItem(item)} alt={nomeItem(item)} />
                <AvatarFallback className="text-xs">{nomeItem(item).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <PessoaPreviewPopover ficha={item.ficha} fichaCasal={item.fichaCasal}>
                        {nomeItem(item)}
                      </PessoaPreviewPopover>
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {item.tipoPessoa === 'JOVEM' ? 'Jovem' : 'Casal'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => remover(item.id)}
                    aria-label="Remover da lista"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {item.nota && <p className="text-xs text-muted-foreground">{item.nota}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
