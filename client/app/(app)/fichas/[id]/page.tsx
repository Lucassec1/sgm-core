'use client';

import { use } from 'react';
import { useFicha } from '@/lib/hooks/use-fichas';
import { FichaForm } from '@/components/fichas/ficha-form';
import { HistoricoEquipesSection } from '@/components/fichas/historico-equipes-section';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/fichas/status-badge';
import { CirculoBadge } from '@/components/fichas/circulo-badge';

export default function FichaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ficha, isLoading, isError } = useFicha(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !ficha) return <p className="p-6 text-sm text-red-600">Ficha não encontrada.</p>;

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <header className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={ficha.fotoUrl || undefined} alt={ficha.nomeCompleto} />
          <AvatarFallback className="text-lg">{ficha.nomeCompleto.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold leading-tight">{ficha.nomeCompleto}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge situacao={ficha.situacao} />
            <CirculoBadge cor={ficha.corCirculo} />
            <span className="text-xs text-muted-foreground">{ficha.numeroEncontro}º Encontro</span>
          </div>
        </div>
      </header>

      <Separator />

      <section>
        <h2 className="text-sm font-medium mb-3">Histórico de Equipes</h2>
        <HistoricoEquipesSection fichaId={ficha.id} />
      </section>

      <Separator />

      <section>
        <h2 className="text-sm font-medium mb-3">Dados cadastrais</h2>
        <FichaForm ficha={ficha} />
      </section>
    </div>
  );
}
