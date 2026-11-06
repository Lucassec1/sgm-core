'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FichaFormValues } from './ficha-schema';
import { SectionTitle } from './section-title';

export function ConviteSection({ bloqueado }: { bloqueado: boolean }) {
  const { register } = useFormContext<FichaFormValues>();

  return (
    <section className="space-y-4">
      <SectionTitle>Convite</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nomeConvidante">Nome de quem convidou</Label>
          <Input id="nomeConvidante" disabled={bloqueado} {...register('nomeConvidante')} />
        </div>
        <div>
          <Label htmlFor="telefoneConvidante">Telefone do convidante</Label>
          <Input id="telefoneConvidante" disabled={bloqueado} {...register('telefoneConvidante')} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="enderecoConvidante">Endereço do convidante</Label>
          <Input id="enderecoConvidante" disabled={bloqueado} {...register('enderecoConvidante')} />
        </div>
      </div>
    </section>
  );
}
