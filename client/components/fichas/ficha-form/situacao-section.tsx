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
import type { FichaFormValues } from './ficha-schema';

// Situação da ficha (ativa/inativa + motivo) — só aparece na edição: ficha nova nasce ATIVA.
export function SituacaoSection() {
  const { register, watch, setValue } = useFormContext<FichaFormValues>();

  return (
    <div className="grid grid-cols-2 gap-4 rounded-md border p-4">
      <div>
        <Label>Situação</Label>
        <Select
          value={watch('situacao')}
          onValueChange={(v) => setValue('situacao', v as 'ATIVA' | 'INATIVA')}
        >
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
  );
}
