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
import {
  SementeiraCampos,
  camposSementeira,
  intervaloJovens,
  payloadSementeira,
  textoIntervalo,
} from './sementeira-campos';
import { useCreateMontagem } from '@/lib/hooks/use-montagens';

// Campos seguem docs/ux-e-fluxos.md (1.2, "Dados do encontro") e a validação de tamanho do
// encontro é a mesma da Service (R6 — ver docs/regras-imutaveis.md): 40 a 60 jovens
// vivenciando locais, mais os da sementeira quando o encontro recebe sementeira.
const montagemSchema = z
  .object({
    data: z.string().min(1, 'Informe a data do encontro'),
    padroeiro: z.string().optional(),
    diretorEspiritual: z.string().optional(),
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
    defaultValues: { recebeSementeira: false, quantidadeJovensSementeira: 12 },
  });

  const onSubmit = async (values: MontagemFormValues) => {
    try {
      const { recebeSementeira, quantidadeJovensSementeira, sementeiraDeImplantacaoId, ...dados } =
        values;
      const montagem = await createMontagem.mutateAsync({
        ...dados,
        ...payloadSementeira({
          recebeSementeira,
          quantidadeJovensSementeira,
          sementeiraDeImplantacaoId,
        }),
      });
      toast.success('Montagem criada.');
      setOpen(false);
      reset();
      router.push(`/montagem/${montagem.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar a montagem.');
    }
  };

  const recebeSementeira = watch('recebeSementeira');
  const quantidadeSementeira = watch('quantidadeJovensSementeira');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nova montagem</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Nova montagem</DialogTitle>
            <DialogDescription>
              O número do encontro é calculado automaticamente. Preencha os dados abaixo pra abrir o
              quadro das 16 equipes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="data">Data do encontro</Label>
              <Input id="data" type="date" {...register('data')} />
              {errors.data && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.data.message}</p>
              )}
            </div>
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
            <div>
              <Label htmlFor="padroeiro">Padroeiro</Label>
              <Input id="padroeiro" {...register('padroeiro')} />
            </div>
            <div>
              <Label htmlFor="diretorEspiritual">Diretor espiritual</Label>
              <Input id="diretorEspiritual" {...register('diretorEspiritual')} />
            </div>
            <SementeiraCampos
              className="col-span-2"
              recebe={!!recebeSementeira}
              onRecebeChange={(v) => setValue('recebeSementeira', v)}
              quantidade={register('quantidadeJovensSementeira')}
              erroQuantidade={errors.quantidadeJovensSementeira?.message}
              vinculoId={watch('sementeiraDeImplantacaoId')}
              onVinculoChange={(id) => setValue('sementeiraDeImplantacaoId', id)}
            />
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
