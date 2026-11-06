'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FichaFormValues } from './ficha-schema';
import { SectionTitle } from './section-title';

export function FiliacaoSection({ bloqueado }: { bloqueado: boolean }) {
  const { register } = useFormContext<FichaFormValues>();

  return (
    <section className="space-y-4">
      <SectionTitle>Filiação</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nomePai">Nome do pai</Label>
          <Input id="nomePai" disabled={bloqueado} {...register('nomePai')} />
        </div>
        <div>
          <Label htmlFor="nomeMae">Nome da mãe</Label>
          <Input id="nomeMae" disabled={bloqueado} {...register('nomeMae')} />
        </div>
      </div>
    </section>
  );
}
