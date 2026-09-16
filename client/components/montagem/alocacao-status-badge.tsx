import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StatusConvite } from '@/lib/types';

// Tons suaves + texto (não preenchimento sólido) — mesma convenção do StatusBadge de Fichas,
// ver docs/design-system.md, seção 1.
const ESTILOS: Record<StatusConvite, { label: string; className: string }> = {
  RASCUNHO: {
    label: 'Rascunho',
    className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
  CONVIDADO: {
    label: 'Convidado',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  },
  ACEITO: {
    label: '✓ Aceito',
    className: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  },
  RECUSADO: {
    label: '✕ Recusou',
    className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  },
  DESISTIU: {
    label: '✕ Desistiu',
    className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  },
  SUBSTITUIDO: {
    label: 'Substituído',
    className: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

export function AlocacaoStatusBadge({ status }: { status: StatusConvite }) {
  const estilo = ESTILOS[status];
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent whitespace-nowrap font-medium', estilo.className)}
    >
      {estilo.label}
    </Badge>
  );
}
