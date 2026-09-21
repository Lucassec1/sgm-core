'use client';

import { useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

// Upload de foto 3x4 — substitui o campo `fotoUrl` manual (docs/historico/propostas.md, proposta #4).
// Componente genérico: Ficha do Jovem e Ficha do Casal têm endpoints e hooks próprios (um
// arquivo por registro), mas o widget de UI é o mesmo pros dois.
export function FotoUploadAvatar({
  fotoUrl,
  nome,
  iniciais,
  onUpload,
  onRemover,
  isUploading,
  isRemovendo,
}: {
  fotoUrl?: string;
  nome: string;
  /** Override das iniciais do fallback — por padrão são as 2 primeiras letras de `nome`, mas
   * pra um casal (ex.: "Fulano & Beltrana") uma letra de cada nome fica melhor. */
  iniciais?: string;
  onUpload: (file: File) => void;
  onRemover: () => void;
  isUploading: boolean;
  isRemovendo: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo (ex.: depois de um erro)
    if (!file) return;
    if (!TIPOS_ACEITOS.includes(file.type)) {
      toast.error('Formato não aceito — envie uma imagem JPEG, PNG ou WEBP.');
      return;
    }
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      toast.error('Arquivo acima de 5 MB.');
      return;
    }
    onUpload(file);
  }

  return (
    <div className="group relative shrink-0">
      <Avatar className="h-20 w-20">
        <AvatarImage src={fotoUrl} alt={nome} />
        <AvatarFallback className="text-lg">
          {(iniciais || nome || '??').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS.join(',')}
        className="hidden"
        onChange={aoSelecionar}
        aria-label="Escolher foto"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent disabled:opacity-50"
        aria-label="Trocar foto"
        title="Trocar foto"
      >
        {isUploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Camera className="h-3 w-3" />
        )}
      </button>

      {fotoUrl && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          onClick={onRemover}
          disabled={isRemovendo}
          aria-label="Remover foto"
          title="Remover foto"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
