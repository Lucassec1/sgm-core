'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SementeiraCampos,
  camposSementeira,
  intervaloJovens,
  payloadSementeira,
  textoIntervalo,
} from './sementeira-campos';
import { useUpdateMontagem } from '@/lib/hooks/use-montagens';
import type { Montagem } from '@/lib/types';

const schema = z
  .object({
    numeroJovensVivenciando: z.coerce.number().int(),
    ...camposSementeira,
  })
  .superRefine((d, ctx) => {
    const { minimo, maximo } = intervaloJovens(d.recebeSementeira, d.quantidadeJovensSementeira);
    if (d.numeroJovensVivenciando < minimo || d.numeroJovensVivenciando > maximo) {
      ctx.addIssue({
        code: 'custom',
        path: ['numeroJovensVivenciando'],
        message: `Fora do intervalo: de ${minimo} a ${maximo} jovens`,
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function valoresIniciais(montagem: Montagem): FormValues {
  return {
    numeroJovensVivenciando: montagem.numeroJovensVivenciando,
    recebeSementeira: montagem.recebeSementeira,
    quantidadeJovensSementeira: montagem.quantidadeJovensSementeira ?? 12,
    sementeiraDeImplantacaoId: montagem.sementeiraDeImplantacaoId ?? undefined,
  };
}

// O nº de jovens vivenciando fecha aos poucos, à medida que as fichas vão sendo cadastradas
// (a Montagem já é aberta com uma estimativa) — esse ajuste recalcula a Eq. da Visitação
// automaticamente (ver docs/regras-imutaveis.md, R6).
export function EditarTamanhoEncontroDialog({ montagem }: { montagem: Montagem }) {
  const [open, setOpen] = useState(false);
  const updateMontagem = useUpdateMontagem(montagem.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...valoresIniciais(montagem),
    },
  });

  const recebeSementeira = watch('recebeSementeira');
  const quantidadeSementeira = watch('quantidadeJovensSementeira');
  // Encontro de implantação (vagas do anexo) não recebe sementeira — o server recusa.
  const ehAnexo = montagem.anexoImplantacao != null;

  const onSubmit = async (values: FormValues) => {
    try {
      const { recebeSementeira, quantidadeJovensSementeira, sementeiraDeImplantacaoId, ...dados } =
        values;
      await updateMontagem.mutateAsync(
        ehAnexo
          ? dados
          : {
              ...dados,
              ...payloadSementeira({
                recebeSementeira,
                quantidadeJovensSementeira,
                sementeiraDeImplantacaoId,
              }),
            },
      );
      toast.success('Encontro atualizado — Eq. da Visitação recalculada.');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          reset({
            ...valoresIniciais(montagem),
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
          Ajustar tamanho
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Ajustar tamanho do encontro</DialogTitle>
            <DialogDescription>
              Atualiza o nº de jovens vivenciando e recalcula a quantidade de casais da Eq. da
              Visitação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="numeroJovensVivenciando">Nº de jovens vivenciando</Label>
              <Input
                id="numeroJovensVivenciando"
                type="number"
                {...register('numeroJovensVivenciando')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {textoIntervalo(recebeSementeira, quantidadeSementeira)}
              </p>
              {errors.numeroJovensVivenciando && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.numeroJovensVivenciando.message}
                </p>
              )}
            </div>
            {!ehAnexo && (
              <SementeiraCampos
                recebe={!!recebeSementeira}
                onRecebeChange={(v) => setValue('recebeSementeira', v)}
                quantidade={register('quantidadeJovensSementeira')}
                erroQuantidade={errors.quantidadeJovensSementeira?.message}
                vinculoId={watch('sementeiraDeImplantacaoId')}
                onVinculoChange={(id) => setValue('sementeiraDeImplantacaoId', id)}
              />
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
