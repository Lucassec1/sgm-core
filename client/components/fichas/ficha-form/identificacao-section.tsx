'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CORES_CIRCULO } from '@/lib/types';
import { useMinhasImplantacoes } from '@/lib/hooks/use-implantacoes';
import type { FichaFormValues } from './ficha-schema';
import { SectionTitle } from '../section-title';

export function IdentificacaoSection({
  bloqueado,
  isEdit,
}: {
  bloqueado: boolean;
  isEdit: boolean;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FichaFormValues>();
  // Implantação: a madrinha marca quem é jovem da afilhada que vivenciou aqui (Sementeira). Fica
  // editável mesmo numa ficha já criada — as fichas da sementeira costumam já existir.
  const { data: implantacoes } = useMinhasImplantacoes();
  const emSementeira = implantacoes?.filter((i) => i.fase === 'SEMENTEIRA') ?? [];
  const SEM_SEMENTEIRA = 'nenhuma';

  return (
    <section className="space-y-4">
      <SectionTitle>Identificação</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div className="col-span-2">
            <Label
              htmlFor="nomeCompleto"
              className="after:ml-0.5 after:text-muted-foreground after:content-['*']"
            >
              Nome completo
            </Label>
            <Input aria-required="true" id="nomeCompleto" {...register('nomeCompleto')} />
            {errors.nomeCompleto && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.nomeCompleto.message}
              </p>
            )}
          </div>
        )}
        <div>
          <Label className="after:ml-0.5 after:text-muted-foreground after:content-['*']">
            Sexo
          </Label>
          <Select
            value={watch('sexo')}
            onValueChange={(v) => setValue('sexo', v as FichaFormValues['sexo'])}
            disabled={bloqueado}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RAPAZ">Rapaz</SelectItem>
              <SelectItem value="MOCA">Moça</SelectItem>
            </SelectContent>
          </Select>
          {errors.sexo && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.sexo.message}</p>
          )}
        </div>
        <div>
          <Label
            htmlFor="dataNascimento"
            className="after:ml-0.5 after:text-muted-foreground after:content-['*']"
          >
            Data de nascimento
          </Label>
          <Input
            aria-required="true"
            id="dataNascimento"
            type="date"
            disabled={bloqueado}
            {...register('dataNascimento')}
          />
          {errors.dataNascimento && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors.dataNascimento.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="naturalidade">Naturalidade</Label>
          <Input id="naturalidade" disabled={bloqueado} {...register('naturalidade')} />
        </div>
        <div>
          <Label
            htmlFor="telefone"
            className="after:ml-0.5 after:text-muted-foreground after:content-['*']"
          >
            Telefone
          </Label>
          <Input
            aria-required="true"
            id="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            {...register('telefone')}
          />
          {errors.telefone && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.telefone.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            spellCheck={false}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label
            htmlFor="numeroEncontro"
            className="after:ml-0.5 after:text-muted-foreground after:content-['*']"
          >
            Nº do encontro
          </Label>
          <Input
            aria-required="true"
            id="numeroEncontro"
            type="number"
            disabled={bloqueado}
            {...register('numeroEncontro')}
          />
          {errors.numeroEncontro && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors.numeroEncontro.message}
            </p>
          )}
        </div>
        <div>
          <Label className="after:ml-0.5 after:text-muted-foreground after:content-['*']">
            Cor do círculo
          </Label>
          <Select
            value={watch('corCirculo')}
            onValueChange={(v) => setValue('corCirculo', v as FichaFormValues['corCirculo'])}
            disabled={bloqueado}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {CORES_CIRCULO.map((cor) => (
                <SelectItem key={cor.value} value={cor.value}>
                  {cor.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.corCirculo && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors.corCirculo.message}
            </p>
          )}
        </div>
        {emSementeira.length > 0 && (
          <div>
            <Label htmlFor="sementeiraDeId">Sementeira de</Label>
            <Select
              value={watch('sementeiraDeId') ?? SEM_SEMENTEIRA}
              onValueChange={(v) => setValue('sementeiraDeId', v === SEM_SEMENTEIRA ? null : v)}
            >
              <SelectTrigger id="sementeiraDeId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_SEMENTEIRA}>Não é sementeira</SelectItem>
                {emSementeira.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.afilhada.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Jovem da paróquia afilhada que vivenciou aqui. Quando a implantação começar, a ficha
              passa para ela.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
