'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FichaFormValues } from './ficha-schema';
import { SectionTitle } from '../section-title';

export function EnderecoSection() {
  const { register } = useFormContext<FichaFormValues>();

  return (
    <section className="space-y-4">
      <SectionTitle>Endereço</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
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
      </div>
    </section>
  );
}
