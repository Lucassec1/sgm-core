'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { FichaCasal } from '@/lib/types';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { useCreateFichaCasal, useUpdateFichaCasal } from '@/lib/hooks/use-fichas-casais';
import { nullsToUndefined } from '@/lib/utils';

// Ficha do Casal — mais simples que a do Jovem: sem escolaridade, religião/sacramentos ou
// convite (ver docs/requisitos.md, 2.1). Histórico de equipes e Avaliação ficam para o
// módulo Montagem, igual à Ficha do Jovem.
const fichaCasalSchema = z.object({
  nomeEle: z.string().min(3, 'Informe o nome dele'),
  nomeEla: z.string().min(3, 'Informe o nome dela'),
  dataNascimentoEle: z.string().optional(),
  dataNascimentoEla: z.string().optional(),
  telefoneEle: z.string().min(1, 'Informe o telefone dele'),
  telefoneEla: z.string().min(1, 'Informe o telefone dela'),
  emailEle: z.string().email('E-mail inválido').optional().or(z.literal('')),
  emailEla: z.string().email('E-mail inválido').optional().or(z.literal('')),
  fotoUrl: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  temFilhosNoSegueMe: z.boolean().optional(),
  observacoesFilhos: z.string().optional(),
  observacoes: z.string().optional(),
  situacao: z.enum(['ATIVA', 'INATIVA']).optional(),
  motivoDesativacao: z.string().optional(),
});

type FichaCasalFormValues = z.infer<typeof fichaCasalSchema>;

export function FichaCasalForm({ ficha }: { ficha?: FichaCasal }) {
  const router = useRouter();
  const isEdit = !!ficha;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FichaCasalFormValues>({
    resolver: zodResolver(fichaCasalSchema),
    mode: 'onBlur',
    defaultValues: ficha
      ? {
          ...nullsToUndefined(ficha),
          dataNascimentoEle: ficha.dataNascimentoEle?.slice(0, 10) ?? '',
          dataNascimentoEla: ficha.dataNascimentoEla?.slice(0, 10) ?? '',
        }
      : { temFilhosNoSegueMe: false, situacao: 'ATIVA' },
  });

  useEffect(() => {
    if (ficha) {
      reset({
        ...nullsToUndefined(ficha),
        dataNascimentoEle: ficha.dataNascimentoEle?.slice(0, 10) ?? '',
        dataNascimentoEla: ficha.dataNascimentoEla?.slice(0, 10) ?? '',
      });
    }
  }, [ficha, reset]);

  const createFichaCasal = useCreateFichaCasal();
  const updateFichaCasal = useUpdateFichaCasal(ficha?.id ?? '');

  const onSubmit = async (values: FichaCasalFormValues) => {
    if (isEdit) {
      await updateFichaCasal.mutateAsync(values);
    } else {
      const created = await createFichaCasal.mutateAsync({ ...values, paroquiaId: PAROQUIA_ID_PROVISORIA });
      router.push(`/fichas/casais/${created.id}`);
    }
  };

  const fotoUrl = watch('fotoUrl');
  const nomeEle = watch('nomeEle');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={fotoUrl || undefined} alt={nomeEle} />
          <AvatarFallback>{(nomeEle || '??').slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Label htmlFor="fotoUrl">Foto (URL)</Label>
          <Input id="fotoUrl" placeholder="https://..." {...register('fotoUrl')} />
        </div>
      </div>

      {isEdit && (
        <div className="grid grid-cols-2 gap-4 rounded-md border p-4">
          <div>
            <Label>Situação</Label>
            <Select value={watch('situacao')} onValueChange={(v) => setValue('situacao', v as 'ATIVA' | 'INATIVA')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVA">Ativa</SelectItem>
                <SelectItem value="INATIVA">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {watch('situacao') === 'INATIVA' && (
            <div>
              <Label htmlFor="motivoDesativacao">Motivo da desativação</Label>
              <Input id="motivoDesativacao" {...register('motivoDesativacao')} />
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="identificacao">
        <TabsList>
          <TabsTrigger value="identificacao">Identificação</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
        </TabsList>

        <TabsContent value="identificacao" className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nomeEle">Nome (dele)</Label>
            <Input id="nomeEle" {...register('nomeEle')} />
            {errors.nomeEle && <p className="text-xs text-red-600 mt-1">{errors.nomeEle.message}</p>}
          </div>
          <div>
            <Label htmlFor="nomeEla">Nome (dela)</Label>
            <Input id="nomeEla" {...register('nomeEla')} />
            {errors.nomeEla && <p className="text-xs text-red-600 mt-1">{errors.nomeEla.message}</p>}
          </div>
          <div>
            <Label htmlFor="dataNascimentoEle">Data de nascimento (dele)</Label>
            <Input id="dataNascimentoEle" type="date" {...register('dataNascimentoEle')} />
          </div>
          <div>
            <Label htmlFor="dataNascimentoEla">Data de nascimento (dela)</Label>
            <Input id="dataNascimentoEla" type="date" {...register('dataNascimentoEla')} />
          </div>
          <div>
            <Label htmlFor="telefoneEle">Telefone (dele)</Label>
            <Input id="telefoneEle" {...register('telefoneEle')} />
            {errors.telefoneEle && <p className="text-xs text-red-600 mt-1">{errors.telefoneEle.message}</p>}
          </div>
          <div>
            <Label htmlFor="telefoneEla">Telefone (dela)</Label>
            <Input id="telefoneEla" {...register('telefoneEla')} />
            {errors.telefoneEla && <p className="text-xs text-red-600 mt-1">{errors.telefoneEla.message}</p>}
          </div>
          <div>
            <Label htmlFor="emailEle">E-mail (dele)</Label>
            <Input id="emailEle" type="email" {...register('emailEle')} />
            {errors.emailEle && <p className="text-xs text-red-600 mt-1">{errors.emailEle.message}</p>}
          </div>
          <div>
            <Label htmlFor="emailEla">E-mail (dela)</Label>
            <Input id="emailEla" type="email" {...register('emailEla')} />
            {errors.emailEla && <p className="text-xs text-red-600 mt-1">{errors.emailEla.message}</p>}
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <Checkbox
              id="temFilhosNoSegueMe"
              checked={watch('temFilhosNoSegueMe')}
              onCheckedChange={(v) => setValue('temFilhosNoSegueMe', !!v)}
            />
            <Label htmlFor="temFilhosNoSegueMe">Tem filho(s) no Segue-me</Label>
          </div>
          {watch('temFilhosNoSegueMe') && (
            <div className="col-span-2">
              <Label htmlFor="observacoesFilhos">Quais / observações</Label>
              <Textarea id="observacoesFilhos" {...register('observacoesFilhos')} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="endereco" className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input id="logradouro" {...register('logradouro')} />
          </div>
          <div>
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" {...register('numero')} />
          </div>
          <div>
            <Label htmlFor="complemento">Complemento</Label>
            <Input id="complemento" {...register('complemento')} />
          </div>
          <div>
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" {...register('bairro')} />
          </div>
          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" {...register('cidade')} />
          </div>
          <div>
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" {...register('estado')} />
          </div>
          <div>
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" {...register('cep')} />
          </div>
        </TabsContent>
      </Tabs>

      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" {...register('observacoes')} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isEdit ? 'Salvar alterações' : 'Criar ficha'}
      </Button>
    </form>
  );
}
