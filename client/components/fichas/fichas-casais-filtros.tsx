'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FiltrosFichasCasais {
  nome?: string;
  situacao?: 'ATIVA' | 'INATIVA';
}

export function FichasCasaisFiltros({
  value,
  onChange,
}: {
  value: FiltrosFichasCasais;
  onChange: (value: FiltrosFichasCasais) => void;
}) {
  const [nome, setNome] = useState(value.nome ?? '');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Buscar por nome (dele ou dela)..."
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => onChange({ ...value, nome })}
        onKeyDown={(e) => e.key === 'Enter' && onChange({ ...value, nome })}
        className="max-w-xs"
      />

      <Select
        value={value.situacao ?? 'todos'}
        onValueChange={(v) => onChange({ ...value, situacao: v === 'todos' ? undefined : (v as 'ATIVA' | 'INATIVA') })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="ATIVA">Ativa</SelectItem>
          <SelectItem value="INATIVA">Inativa</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
