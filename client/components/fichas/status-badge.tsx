import { Badge } from '@/components/ui/badge';
import type { SituacaoFicha } from '@/lib/types';

// Status usa tom suave + ícone, nunca preenchimento sólido — evita ambiguidade com as cores
// do círculo (verde/vermelho/amarelo coincidem) — ver docs/design-system.md, seção 1.
export function StatusBadge({ situacao }: { situacao: SituacaoFicha }) {
  const ativa = situacao === 'ATIVA';
  return (
    <Badge variant={ativa ? 'sucesso' : 'perigo'} className="whitespace-nowrap font-medium">
      {ativa ? '✓ Ativa' : '✕ Inativa'}
    </Badge>
  );
}
