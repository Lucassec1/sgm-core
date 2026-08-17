'use client';

import { use } from 'react';
import { useFichaCasal } from '@/lib/hooks/use-fichas-casais';
import { FichaCasalForm } from '@/components/fichas/ficha-casal-form';
import { HistoricoEquipesCasalSection } from '@/components/fichas/historico-equipes-section';
import { Separator } from '@/components/ui/separator';

export default function FichaCasalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ficha, isLoading, isError } = useFichaCasal(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !ficha) return <p className="p-6 text-sm text-red-600">Casal não encontrado.</p>;

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <h1 className="text-lg font-semibold">
        {ficha.nomeEle} & {ficha.nomeEla}
      </h1>

      <div>
        <h2 className="text-sm font-medium mb-3">Histórico de Equipes</h2>
        <HistoricoEquipesCasalSection fichaCasalId={ficha.id} />
      </div>

      <Separator />

      <div>
        <h2 className="text-sm font-medium mb-3">Dados cadastrais</h2>
        <FichaCasalForm ficha={ficha} />
      </div>
    </div>
  );
}
