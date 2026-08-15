'use client';

import { use } from 'react';
import { useFichaCasal } from '@/lib/hooks/use-fichas-casais';
import { FichaCasalForm } from '@/components/fichas/ficha-casal-form';

export default function FichaCasalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ficha, isLoading, isError } = useFichaCasal(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !ficha) return <p className="p-6 text-sm text-red-600">Casal não encontrado.</p>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold mb-6">
        {ficha.nomeEle} & {ficha.nomeEla}
      </h1>
      <FichaCasalForm ficha={ficha} />
    </div>
  );
}
