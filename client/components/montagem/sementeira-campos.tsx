'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';
import { z } from 'zod';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMinhasImplantacoes } from '@/lib/hooks/use-implantacoes';
import { cn } from '@/lib/utils';

// Sementeira (R6): o encontro da madrinha recebe jovens da afilhada — 12 por padrão, menos se
// alguém desistir — e 4 casais dela na Visitação. Mesmas regras da Service.
export const JOVENS_SEMENTEIRA_PADRAO = 12;

export const camposSementeira = {
  recebeSementeira: z.boolean().optional(),
  sementeiraDeImplantacaoId: z.string().optional(),
  quantidadeJovensSementeira: z.coerce
    .number()
    .int()
    .min(1, 'De 1 a 12 jovens')
    .max(12, 'De 1 a 12 jovens')
    .optional(),
};

// R6 — 40 a 60 jovens locais, mais os da sementeira quando houver.
export function intervaloJovens(recebeSementeira?: boolean, quantidade?: number) {
  const sementeira = recebeSementeira ? (quantidade ?? JOVENS_SEMENTEIRA_PADRAO) : 0;
  return { minimo: 40 + sementeira, maximo: 60 + sementeira, sementeira };
}

export function textoIntervalo(recebeSementeira?: boolean, quantidade?: number) {
  const { minimo, maximo, sementeira } = intervaloJovens(recebeSementeira, quantidade);
  return sementeira
    ? `${minimo} a ${maximo} (já contando os ${sementeira} da sementeira)`
    : `${minimo} a ${maximo}`;
}

// O que vai pra API: sem sementeira, só o "não"; com, a quantidade e o vínculo (se escolhido).
export function payloadSementeira(v: {
  recebeSementeira?: boolean;
  quantidadeJovensSementeira?: number;
  sementeiraDeImplantacaoId?: string;
}) {
  return v.recebeSementeira
    ? {
        recebeSementeira: true,
        quantidadeJovensSementeira: v.quantidadeJovensSementeira ?? JOVENS_SEMENTEIRA_PADRAO,
        ...(v.sementeiraDeImplantacaoId && {
          sementeiraDeImplantacaoId: v.sementeiraDeImplantacaoId,
        }),
      }
    : { recebeSementeira: false };
}

export function SementeiraCampos({
  recebe,
  onRecebeChange,
  quantidade,
  erroQuantidade,
  vinculoId,
  onVinculoChange,
  className,
}: {
  recebe: boolean;
  onRecebeChange: (v: boolean) => void;
  quantidade: UseFormRegisterReturn;
  erroQuantidade?: string;
  vinculoId?: string;
  onVinculoChange: (id: string) => void;
  className?: string;
}) {
  const { data: implantacoes } = useMinhasImplantacoes();
  const emSementeira = implantacoes?.filter((i) => i.fase === 'SEMENTEIRA') ?? [];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Checkbox
          id="recebeSementeira"
          checked={recebe}
          onCheckedChange={(v) => onRecebeChange(!!v)}
        />
        <Label htmlFor="recebeSementeira" className="font-normal">
          Recebe sementeira (jovens de uma paróquia afilhada vivenciam aqui)
        </Label>
      </div>
      {recebe && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="quantidadeJovensSementeira">Jovens da sementeira</Label>
            <Input id="quantidadeJovensSementeira" type="number" min={1} max={12} {...quantidade} />
            <p className="mt-1 text-xs text-muted-foreground">
              12 é o normal; menos se alguém desistir. Somam-se aos jovens locais, e a Visitação
              ganha 4 casais da afilhada.
            </p>
            {erroQuantidade && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{erroQuantidade}</p>
            )}
          </div>
          {emSementeira.length > 0 && (
            <div>
              <Label htmlFor="sementeiraDeImplantacaoId">Paróquia afilhada</Label>
              <Select value={vinculoId} onValueChange={onVinculoChange}>
                <SelectTrigger id="sementeiraDeImplantacaoId">
                  <SelectValue placeholder="Escolha…" />
                </SelectTrigger>
                <SelectContent>
                  {emSementeira.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.afilhada.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
