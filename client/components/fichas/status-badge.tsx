import { Badge } from '@/components/ui/badge';
import type { SituacaoFicha } from '@/lib/types';
import { cn } from '@/lib/utils';

// Status usa tom suave + ícone, nunca preenchimento sólido — evita ambiguidade com as cores
// do círculo (verde/vermelho/amarelo coincidem) — ver docs/design-system.md, seção 1.
export function StatusBadge({ situacao }: { situacao: SituacaoFicha }) {
  const ativa = situacao === 'ATIVA';
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent font-medium',
        ativa
          ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
          : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
      )}
    >
      {ativa ? '✓ Ativa' : '✕ Inativa'}
    </Badge>
  );
}
