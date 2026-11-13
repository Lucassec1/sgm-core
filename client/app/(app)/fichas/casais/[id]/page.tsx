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
import { LiberarFichaButton } from '@/components/fichas/liberar-ficha-button';
import { fotoSrc, iniciais } from '@/lib/utils';

export default function FichaCasalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ficha, isLoading, isError } = useFichaCasal(id);
  const uploadFoto = useUploadFotoFichaCasal(id);
  const removerFoto = useRemoverFotoFichaCasal(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (isError || !ficha)
    return <p className="p-6 text-sm text-red-600 dark:text-red-400">Casal não encontrado.</p>;

  const nomeCasal = `${ficha.nomeEle} e ${ficha.nomeEla}`;

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
          iniciais={iniciais(ficha.nomeEle, ficha.nomeEla)}
          onUpload={aoTrocarFoto}
          onRemover={aoRemoverFoto}
          isUploading={uploadFoto.isPending}
          isRemovendo={removerFoto.isPending}
        />
        <div className="space-y-1.5">
          <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight">
            {nomeCasal}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge situacao={ficha.situacao} />
          </div>
          <LiberarFichaButton fichaCasalId={ficha.id} />
        </div>
      </header>

      <Separator />

      <section>
        <h2 className="mb-3 text-base font-bold">Histórico de equipes</h2>
        <HistoricoEquipesCasalSection fichaCasalId={ficha.id} />
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-base font-bold">Dados cadastrais</h2>
        <FichaCasalForm ficha={ficha} />
      </section>
    </div>
  );
}
