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
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateMontagem } from '@/lib/hooks/use-montagens';
import type { Montagem } from '@/lib/types';

const schema = z
  .object({
    numeroJovensVivenciando: z.coerce.number().int(),
    ehImplantacao: z.boolean().optional(),
    paroquiaAfilhadaNome: z.string().optional(),
  })
  .refine(
    (data) => {
      const minimo = data.ehImplantacao ? 52 : 40;
      const maximo = data.ehImplantacao ? 72 : 60;
      return data.numeroJovensVivenciando >= minimo && data.numeroJovensVivenciando <= maximo;
    },
    {
      message: 'Fora do intervalo (40-60 jovens, ou 52-72 numa implantação — já contando os 12 sementeira)',
      path: ['numeroJovensVivenciando'],
    },
  );

type FormValues = z.infer<typeof schema>;

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
      numeroJovensVivenciando: montagem.numeroJovensVivenciando,
      ehImplantacao: montagem.ehImplantacao,
      paroquiaAfilhadaNome: montagem.paroquiaAfilhadaNome ?? '',
    },
  });

  const ehImplantacao = watch('ehImplantacao');

  const onSubmit = async (values: FormValues) => {
    try {
      await updateMontagem.mutateAsync(values);
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
            numeroJovensVivenciando: montagem.numeroJovensVivenciando,
            ehImplantacao: montagem.ehImplantacao,
            paroquiaAfilhadaNome: montagem.paroquiaAfilhadaNome ?? '',
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
              Atualiza o nº de jovens vivenciando e recalcula a quantidade de casais da Eq. da Visitação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="numeroJovensVivenciando">Nº de jovens vivenciando</Label>
              <Input id="numeroJovensVivenciando" type="number" {...register('numeroJovensVivenciando')} />
              <p className="text-xs text-muted-foreground mt-1">
                {ehImplantacao ? '52 a 72 (já incluindo os 12 sementeira)' : '40 a 60'}
              </p>
              {errors.numeroJovensVivenciando && (
                <p className="text-xs text-red-600 mt-1">{errors.numeroJovensVivenciando.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ehImplantacao"
                checked={ehImplantacao}
                onCheckedChange={(v) => setValue('ehImplantacao', !!v)}
              />
              <Label htmlFor="ehImplantacao" className="font-normal">
                É implantação (lança o Segue-me numa paróquia afilhada)
              </Label>
            </div>
            {ehImplantacao && (
              <>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Soma automaticamente 12 jovens sementeira e 4 casais afilhados na Eq. da Visitação (fixo).
                </div>
                <div>
                  <Label htmlFor="paroquiaAfilhadaNome">Nome da paróquia afilhada</Label>
                  <Input id="paroquiaAfilhadaNome" {...register('paroquiaAfilhadaNome')} />
                </div>
              </>
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
