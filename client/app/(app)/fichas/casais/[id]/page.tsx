'use client';

import { use } from 'react';
import { useFichaCasal } from '@/lib/hooks/use-fichas-casais';
import { FichaCasalForm } from '@/components/fichas/ficha-casal-form';
import { HistoricoEquipesCasalSection } from '@/components/fichas/historico-equipes-section';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/fichas/status-badge';

export default function FichaCasalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ficha, isLoading, isError } = useFichaCasal(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !ficha) return <p className="p-6 text-sm text-red-600">Casal não encontrado.</p>;

  const nomeCasal = `${ficha.nomeEle} & ${ficha.nomeEla}`;

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <header className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={ficha.fotoUrl || undefined} alt={nomeCasal} />
          <AvatarFallback className="text-lg">{ficha.nomeEle.slice(0, 1).toUpperCase()}{ficha.nomeEla.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold leading-tight">{nomeCasal}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge situacao={ficha.situacao} />
          </div>
        </div>
      </header>

      <Separator />

      <section>
        <h2 className="text-sm font-medium mb-3">Histórico de Equipes</h2>
        <HistoricoEquipesCasalSection fichaCasalId={ficha.id} />
      </section>

      <Separator />

      <section>
        <h2 className="text-sm font-medium mb-3">Dados cadastrais</h2>
        <FichaCasalForm ficha={ficha} />
      </section>
    </div>
  );
}
