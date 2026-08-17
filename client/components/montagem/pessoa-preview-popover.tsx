'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CirculoBadge } from '@/components/fichas/circulo-badge';
import type { Ficha, FichaCasal } from '@/lib/types';

// Popover de pré-visualização (docs/ux-e-fluxos.md, seção 3) — evita abrir a ficha completa
// toda hora durante a montagem. Mostra o que já temos sem consulta extra (foto, telefone,
// círculo/encontro); "quantas vezes serviu" e o resumo de avaliação ficam pra quando existir
// um endpoint agregado — por ora o link "Ver ficha completa" cobre esse detalhe.
export function PessoaPreviewPopover({
  ficha,
  fichaCasal,
  children,
}: {
  ficha?: Ficha | null;
  fichaCasal?: FichaCasal | null;
  children: React.ReactNode;
}) {
  if (!ficha && !fichaCasal) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-left hover:underline underline-offset-2">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        {ficha && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={ficha.fotoUrl ?? undefined} alt={ficha.nomeCompleto} />
                <AvatarFallback>{ficha.nomeCompleto.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-tight">{ficha.nomeCompleto}</p>
                <p className="text-xs text-muted-foreground">{ficha.telefone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CirculoBadge cor={ficha.corCirculo} />
              <span>{ficha.numeroEncontro}º Encontro</span>
            </div>
            <Link href={`/fichas/${ficha.id}`} className="text-xs text-primary hover:underline">
              Ver ficha completa
            </Link>
          </div>
        )}
        {fichaCasal && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={fichaCasal.fotoUrl ?? undefined} alt={fichaCasal.nomeEle} />
                <AvatarFallback>{fichaCasal.nomeEle.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-tight">
                  {fichaCasal.nomeEle} e {fichaCasal.nomeEla}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fichaCasal.telefoneEle} · {fichaCasal.telefoneEla}
                </p>
              </div>
            </div>
            <Link href={`/fichas/casais/${fichaCasal.id}`} className="text-xs text-primary hover:underline">
              Ver ficha completa
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
