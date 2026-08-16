'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

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
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { useCreateMontagem } from '@/lib/hooks/use-montagens';

// Campos seguem docs/ux-e-fluxos.md (1.2, "Dados do encontro") e a validação de tamanho
// do encontro é a mesma da Service (R6 — ver docs/regras-imutaveis.md): 40 a 60 jovens
// vivenciando, ou até 72 em caso de sementeira.
const montagemSchema = z
  .object({
    data: z.string().min(1, 'Informe a data do encontro'),
    padroeiro: z.string().optional(),
    diretorEspiritual: z.string().optional(),
    ehSementeira: z.boolean().optional(),
    quantidadeFichasSementeira: z.coerce.number().int().min(1).optional(),
    numeroJovensVivenciando: z.coerce.number().int().min(40, 'Mínimo de 40 jovens vivenciando'),
  })
  .refine((data) => data.numeroJovensVivenciando <= (data.ehSementeira ? 72 : 60), {
    message: 'Máximo de 60 jovens vivenciando (72 em caso de sementeira)',
    path: ['numeroJovensVivenciando'],
  });

type MontagemFormValues = z.infer<typeof montagemSchema>;

export function NovaMontagemDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const createMontagem = useCreateMontagem();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MontagemFormValues>({
    resolver: zodResolver(montagemSchema),
    defaultValues: { ehSementeira: false },
  });

  const onSubmit = async (values: MontagemFormValues) => {
    const montagem = await createMontagem.mutateAsync({ ...values, paroquiaId: PAROQUIA_ID_PROVISORIA });
    setOpen(false);
    reset();
    router.push(`/montagem/${montagem.id}`);
  };

  const ehSementeira = watch('ehSementeira');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nova Montagem</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Nova Montagem</DialogTitle>
            <DialogDescription>
              O número do encontro é calculado automaticamente. Preencha os dados abaixo pra abrir o quadro das 16 equipes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="data">Data do encontro</Label>
              <Input id="data" type="date" {...register('data')} />
              {errors.data && <p className="text-xs text-red-600 mt-1">{errors.data.message}</p>}
            </div>
            <div>
              <Label htmlFor="numeroJovensVivenciando">Nº de jovens vivenciando</Label>
              <Input id="numeroJovensVivenciando" type="number" {...register('numeroJovensVivenciando')} />
              {errors.numeroJovensVivenciando && (
                <p className="text-xs text-red-600 mt-1">{errors.numeroJovensVivenciando.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="padroeiro">Padroeiro</Label>
              <Input id="padroeiro" {...register('padroeiro')} />
            </div>
            <div>
              <Label htmlFor="diretorEspiritual">Diretor espiritual</Label>
              <Input id="diretorEspiritual" {...register('diretorEspiritual')} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                id="ehSementeira"
                checked={ehSementeira}
                onCheckedChange={(v) => setValue('ehSementeira', !!v)}
              />
              <Label htmlFor="ehSementeira" className="font-normal">É sementeira (permite até 72 jovens vivenciando)</Label>
            </div>
            {ehSementeira && (
              <div className="col-span-2">
                <Label htmlFor="quantidadeFichasSementeira">Nº de fichas vindas da sementeira</Label>
                <Input id="quantidadeFichasSementeira" type="number" {...register('quantidadeFichasSementeira')} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Criar montagem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
