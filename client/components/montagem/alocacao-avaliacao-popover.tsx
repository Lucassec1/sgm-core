'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateAlocacao } from '@/lib/hooks/use-montagens';
import type { Alocacao } from '@/lib/types';

// Avaliação por equipe servida — mesmo modelo da ficha física do Segue-me: quem coordena
// marca se a pessoa pode coordenar/palestrar NAQUELA equipe específica, mais uma observação
// livre. Cada Alocacao já é o registro certo pra isso (1 por equipe/encontro que a pessoa
// serviu), só faltava a tela.
export function AlocacaoAvaliacaoPopover({ montagemId, alocacao }: { montagemId: string; alocacao: Alocacao }) {
  const [open, setOpen] = useState(false);
  const [podeCoordenar, setPodeCoordenar] = useState(!!alocacao.podeCoordenar);
  const [podePalestrar, setPodePalestrar] = useState(!!alocacao.podePalestrar);
  const [observacao, setObservacao] = useState(alocacao.observacoesAvaliacao ?? '');
  const updateAlocacao = useUpdateAlocacao(montagemId);

  async function salvar() {
    try {
      await updateAlocacao.mutateAsync({
        id: alocacao.id,
        podeCoordenar,
        podePalestrar,
        observacoesAvaliacao: observacao.trim() || undefined,
      });
      toast.success('Avaliação salva.');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a avaliação.');
    }
  }

  const jaAvaliado = alocacao.podeCoordenar || alocacao.podePalestrar || !!alocacao.observacoesAvaliacao;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={jaAvaliado ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" aria-label="Avaliar">
          <ClipboardCheck className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="end">
        <p className="text-sm font-medium">Avaliação nessa equipe</p>
        <div className="flex items-center gap-2">
          <Checkbox id={`coordenar-${alocacao.id}`} checked={podeCoordenar} onCheckedChange={(v) => setPodeCoordenar(!!v)} />
          <Label htmlFor={`coordenar-${alocacao.id}`} className="font-normal">Pode coordenar essa equipe</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={`palestrar-${alocacao.id}`} checked={podePalestrar} onCheckedChange={(v) => setPodePalestrar(!!v)} />
          <Label htmlFor={`palestrar-${alocacao.id}`} className="font-normal">Pode palestrar</Label>
        </div>
        <div>
          <Label htmlFor={`observacao-${alocacao.id}`}>Observação</Label>
          <Textarea
            id={`observacao-${alocacao.id}`}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={salvar} disabled={updateAlocacao.isPending}>
            Salvar avaliação
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
