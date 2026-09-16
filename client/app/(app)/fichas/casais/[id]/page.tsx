'use client';

import { use } from 'react';
import { toast } from 'sonner';
import {
  useFichaCasal,
  useRemoverFotoFichaCasal,
  useUploadFotoFichaCasal,
} from '@/lib/hooks/use-fichas-casais';
import { FichaCasalForm } from '@/components/fichas/ficha-casal-form';
import { FotoUploadAvatar } from '@/components/fichas/foto-upload-avatar';
import { HistoricoEquipesCasalSection } from '@/components/fichas/historico-equipes-section';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/fichas/status-badge';
import { fotoSrc } from '@/lib/utils';

export default function FichaCasalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ficha, isLoading, isError } = useFichaCasal(id);
  const uploadFoto = useUploadFotoFichaCasal(id);
  const removerFoto = useRemoverFotoFichaCasal(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !ficha) return <p className="p-6 text-sm text-red-600">Casal não encontrado.</p>;

  const nomeCasal = `${ficha.nomeEle} & ${ficha.nomeEla}`;

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
          nome={nomeCasal}
          iniciais={`${ficha.nomeEle.slice(0, 1)}${ficha.nomeEla.slice(0, 1)}`}
          onUpload={aoTrocarFoto}
          onRemover={aoRemoverFoto}
          isUploading={uploadFoto.isPending}
          isRemovendo={removerFoto.isPending}
        />
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
