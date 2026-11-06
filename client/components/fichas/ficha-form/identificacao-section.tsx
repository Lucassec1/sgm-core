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
import type { FichaFormValues } from './ficha-schema';
import { SectionTitle } from './section-title';

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

  return (
    <section className="space-y-4">
      <SectionTitle>Identificação</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div className="col-span-2">
            <Label htmlFor="nomeCompleto">Nome completo</Label>
            <Input id="nomeCompleto" {...register('nomeCompleto')} />
            {errors.nomeCompleto && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.nomeCompleto.message}
              </p>
            )}
          </div>
        )}
        <div>
          <Label>Sexo</Label>
          <Select
            value={watch('sexo')}
            onValueChange={(v) => setValue('sexo', v as FichaFormValues['sexo'])}
            disabled={bloqueado}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
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
          <Label htmlFor="dataNascimento">Data de nascimento</Label>
          <Input
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
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" {...register('telefone')} />
          {errors.telefone && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.telefone.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="numeroEncontro">Nº do encontro</Label>
          <Input
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
          <Label>Cor do círculo</Label>
          <Select
            value={watch('corCirculo')}
            onValueChange={(v) => setValue('corCirculo', v as FichaFormValues['corCirculo'])}
            disabled={bloqueado}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
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
      </div>
    </section>
  );
}
