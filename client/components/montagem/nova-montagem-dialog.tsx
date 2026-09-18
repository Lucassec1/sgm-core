'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
import { useCreateMontagem } from '@/lib/hooks/use-montagens';

// Campos seguem docs/ux-e-fluxos.md (1.2, "Dados do encontro") e a validação de tamanho do
// encontro é a mesma da Service (R6 — ver docs/regras-imutaveis.md): 40 a 60 jovens
// vivenciando locais, ou 52 a 72 (soma dos 12 sementeira fixos) numa implantação.
const montagemSchema = z
  .object({
    data: z.string().min(1, 'Informe a data do encontro'),
    padroeiro: z.string().optional(),
    diretorEspiritual: z.string().optional(),
    ehImplantacao: z.boolean().optional(),
    paroquiaAfilhadaNome: z.string().optional(),
    numeroJovensVivenciando: z.coerce.number().int(),
  })
  .refine(
    (data) => {
      const minimo = data.ehImplantacao ? 52 : 40;
      const maximo = data.ehImplantacao ? 72 : 60;
      return data.numeroJovensVivenciando >= minimo && data.numeroJovensVivenciando <= maximo;
    },
    {
      message:
        'Fora do intervalo (40-60 jovens, ou 52-72 numa implantação — já contando os 12 sementeira)',
      path: ['numeroJovensVivenciando'],
    },
  );

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
    defaultValues: { ehImplantacao: false },
  });

  const onSubmit = async (values: MontagemFormValues) => {
    try {
      const montagem = await createMontagem.mutateAsync({ ...values });
      toast.success('Montagem criada.');
      setOpen(false);
      reset();
      router.push(`/montagem/${montagem.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar a montagem.');
    }
  };

  const ehImplantacao = watch('ehImplantacao');

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
              O número do encontro é calculado automaticamente. Preencha os dados abaixo pra abrir o
              quadro das 16 equipes.
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
              <Input
                id="numeroJovensVivenciando"
                type="number"
                {...register('numeroJovensVivenciando')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {ehImplantacao ? '52 a 72 (já incluindo os 12 sementeira)' : '40 a 60'}
              </p>
              {errors.numeroJovensVivenciando && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.numeroJovensVivenciando.message}
                </p>
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
                <div className="col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  Soma automaticamente 12 jovens sementeira da paróquia afilhada e 4 casais
                  afilhados na Eq. da Visitação (fixo, não editável).
                </div>
                <div className="col-span-2">
                  <Label htmlFor="paroquiaAfilhadaNome">Nome da paróquia afilhada</Label>
                  <Input id="paroquiaAfilhadaNome" {...register('paroquiaAfilhadaNome')} />
                </div>
              </>
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
