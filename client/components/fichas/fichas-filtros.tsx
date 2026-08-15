'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEncontros } from '@/lib/hooks/use-fichas';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';

export interface FiltrosFichas {
  nome?: string;
  numeroEncontro?: number;
  situacao?: 'ATIVA' | 'INATIVA';
}

// Busca por nome (texto livre) + Select de encontro + Select de status —
// ver docs/ux-e-fluxos.md, seção 2 ("Lista de Fichas").
export function FichasFiltros({ value, onChange }: { value: FiltrosFichas; onChange: (value: FiltrosFichas) => void }) {
  const [nome, setNome] = useState(value.nome ?? '');
  const { data: encontros } = useEncontros(PAROQUIA_ID_PROVISORIA);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Buscar por nome..."
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => onChange({ ...value, nome })}
        onKeyDown={(e) => e.key === 'Enter' && onChange({ ...value, nome })}
        className="max-w-xs"
      />

      <Select
        value={value.numeroEncontro ? String(value.numeroEncontro) : 'todos'}
        onValueChange={(v) => onChange({ ...value, numeroEncontro: v === 'todos' ? undefined : Number(v) })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Encontro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os encontros</SelectItem>
          {encontros?.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}º Encontro
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
