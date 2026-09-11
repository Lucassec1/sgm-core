'use client';

import { use } from 'react';
import { toast } from 'sonner';
import { useFicha, useRemoverFotoFicha, useUploadFotoFicha } from '@/lib/hooks/use-fichas';
import { FichaForm } from '@/components/fichas/ficha-form';
import { FotoUploadAvatar } from '@/components/fichas/foto-upload-avatar';
import { HistoricoEquipesSection } from '@/components/fichas/historico-equipes-section';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/fichas/status-badge';
import { CirculoBadge } from '@/components/fichas/circulo-badge';
import { fotoSrc } from '@/lib/utils';

export default function FichaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ficha, isLoading, isError } = useFicha(id);
  const uploadFoto = useUploadFotoFicha(id);
  const removerFoto = useRemoverFotoFicha(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !ficha) return <p className="p-6 text-sm text-red-600">Ficha não encontrada.</p>;

  async function aoTrocarFoto(file: File) {
    try {
      await uploadFoto.mutateAsync(file);
      toast.success('Foto atualizada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar a foto.');
    }
  }

  async function aoRemoverFoto() {
    try {
      await removerFoto.mutateAsync();
      toast.success('Foto removida.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover a foto.');
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <header className="flex items-center gap-4">
        <FotoUploadAvatar
          fotoUrl={fotoSrc(ficha.fotoUrl)}
          nome={ficha.nomeCompleto}
          onUpload={aoTrocarFoto}
          onRemover={aoRemoverFoto}
          isUploading={uploadFoto.isPending}
          isRemovendo={removerFoto.isPending}
        />
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
