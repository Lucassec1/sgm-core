'use client';

import { Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useDeleteListaSubstituicaoItem, useListaSubstituicao } from '@/lib/hooks/use-montagens';
import { AdicionarSubstitutoCombobox } from './adicionar-substituto-combobox';
import { PessoaPreviewPopover } from './pessoa-preview-popover';

function nomeItem(item: { ficha?: { nomeCompleto: string } | null; fichaCasal?: { nomeEle: string; nomeEla: string } | null }) {
  return item.ficha?.nomeCompleto ?? (item.fichaCasal ? `${item.fichaCasal.nomeEle} e ${item.fichaCasal.nomeEla}` : '—');
}

// Banco geral de backups da montagem (docs/ux-e-fluxos.md, seção 3) — independente de
// vaga/equipe, por encontro. Não carrega automaticamente de um encontro pro outro.
export function ListaSubstituicaoSection({ montagemId }: { montagemId: string }) {
  const { data: itens, isLoading } = useListaSubstituicao(montagemId);
  const deleteItem = useDeleteListaSubstituicaoItem(montagemId);

  const idsJaNaLista = new Set((itens ?? []).map((i) => i.fichaId ?? i.fichaCasalId ?? ''));

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-md">
          Pessoas cotadas como boa opção de substituição em qualquer equipe — consulte aqui primeiro quando alguém sair de uma vaga.
        </p>
        <AdicionarSubstitutoCombobox montagemId={montagemId} idsJaNaLista={idsJaNaLista} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {itens && itens.length === 0 && (
        <p className="text-sm text-muted-foreground">Ninguém na lista ainda.</p>
      )}

      {itens && itens.length > 0 && (
        <ul className="space-y-1">
          {itens.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="flex items-start gap-2">
                <Star className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <PessoaPreviewPopover ficha={item.ficha} fichaCasal={item.fichaCasal}>
                    {nomeItem(item)}
                  </PessoaPreviewPopover>
                  {item.nota && <p className="text-xs text-muted-foreground">{item.nota}</p>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remover(item.id)} aria-label="Remover da lista">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
