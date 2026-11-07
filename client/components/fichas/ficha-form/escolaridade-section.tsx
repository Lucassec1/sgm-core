'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FichaFormValues } from './ficha-schema';
import { SectionTitle } from '../section-title';

export function EscolaridadeSection({ bloqueado }: { bloqueado: boolean }) {
  const { register } = useFormContext<FichaFormValues>();

  return (
    <section className="space-y-4">
      <SectionTitle>Escolaridade</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="grauEscolaridade">Grau de escolaridade</Label>
          <Input id="grauEscolaridade" disabled={bloqueado} {...register('grauEscolaridade')} />
        </div>
        <div>
          <Label htmlFor="situacaoEscolar">Situação</Label>
          <Input
            id="situacaoEscolar"
            disabled={bloqueado}
            {...register('situacaoEscolar')}
            placeholder="Cursando, formado…"
          />
        </div>
        <div>
          <Label htmlFor="curso">Curso</Label>
          <Input id="curso" disabled={bloqueado} {...register('curso')} />
        </div>
        <div>
          <Label htmlFor="instituicao">Instituição</Label>
          <Input id="instituicao" disabled={bloqueado} {...register('instituicao')} />
        </div>
      </div>
    </section>
  );
}
