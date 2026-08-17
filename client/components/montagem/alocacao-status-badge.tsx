import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StatusConvite } from '@/lib/types';

// Tons suaves + texto (não preenchimento sólido) — mesma convenção do StatusBadge de Fichas,
// ver docs/design-system.md, seção 1.
const ESTILOS: Record<StatusConvite, { label: string; className: string }> = {
  RASCUNHO: { label: 'Rascunho', className: 'bg-zinc-100 text-zinc-700' },
  CONVIDADO: { label: 'Convidado', className: 'bg-blue-50 text-blue-700' },
  ACEITO: { label: '✓ Aceito', className: 'bg-green-50 text-green-700' },
  RECUSADO: { label: '✕ Recusou', className: 'bg-red-50 text-red-700' },
  DESISTIU: { label: '✕ Desistiu', className: 'bg-red-50 text-red-700' },
  SUBSTITUIDO: { label: 'Substituído', className: 'bg-zinc-100 text-zinc-500' },
};

export function AlocacaoStatusBadge({ status }: { status: StatusConvite }) {
  const estilo = ESTILOS[status];
  return <Badge variant="outline" className={cn('border-transparent font-medium', estilo.className)}>{estilo.label}</Badge>;
}
