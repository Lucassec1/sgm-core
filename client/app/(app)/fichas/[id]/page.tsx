'use client';

import { use } from 'react';
import { useFicha } from '@/lib/hooks/use-fichas';
import { FichaForm } from '@/components/fichas/ficha-form';

export default function FichaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ficha, isLoading, isError } = useFicha(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !ficha) return <p className="p-6 text-sm text-red-600">Ficha não encontrada.</p>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold mb-6">{ficha.nomeCompleto}</h1>
      <FichaForm ficha={ficha} />
    </div>
  );
}
