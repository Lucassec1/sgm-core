'use client';

import { useRef, useState } from 'react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { useDeleteQuadrante, useQuadrantes, useUploadQuadrante } from '@/lib/hooks/use-montagens';

function formatarTamanho(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Aba Quadrantes (docs/requisitos.md, 2.3) — só anexo de PDF da Eq. da Gráfica, sem campos
// cadastráveis. Upload e download; o binário fica no server, aqui é a lista + ações.
export function QuadrantesSection({ montagemId, readOnly = false }: { montagemId: string; readOnly?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const { data: arquivos, isLoading } = useQuadrantes(montagemId);
  const upload = useUploadQuadrante(montagemId);
  const remover = useDeleteQuadrante(montagemId);

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Só PDF é aceito.');
      return;
    }
    setEnviando(true);
    try {
      await upload.mutateAsync({ file });
      toast.success(`${file.name} enviado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  }

  async function aoRemover(id: string, nome: string) {
    try {
      await remover.mutateAsync(id);
      toast.success(`${nome} removido.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="max-w-md text-sm text-muted-foreground">
          PDFs dos quadrantes da Equipe da Gráfica. Só anexo — sem campos pra preencher.
        </p>
        {!readOnly && (
          <>
            <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={aoEscolher} />
            <Button size="sm" className="gap-1.5" disabled={enviando} onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              {enviando ? 'Enviando...' : 'Enviar PDF'}
            </Button>
          </>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {arquivos && arquivos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum quadrante anexado ainda.</p>}

      {arquivos && arquivos.length > 0 && (
        <ul className="divide-y rounded-md border">
          {arquivos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.nomeOriginal}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarTamanho(a.tamanhoBytes)} · {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                  {a.usuario && ` · ${a.usuario}`}
                </p>
              </div>
              <a
                href={apiClient.quadranteDownloadUrl(montagemId, a.id)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar
              </a>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => aoRemover(a.id, a.nomeOriginal)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
