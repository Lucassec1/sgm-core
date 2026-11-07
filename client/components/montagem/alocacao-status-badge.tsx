import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { StatusConvite } from '@/lib/types';

// Fonte única do status de convite — tabela de convites, saídas, drawer e lista completa usam
// este badge (docs/design-system.md, seção 1): verde aceito, âmbar aguardando resposta,
// vermelho saiu, neutro rascunho/substituído. Sempre com texto; ícone onde há desfecho.
const ESTILOS: Record<StatusConvite, { label: string; variant: BadgeProps['variant'] }> = {
  RASCUNHO: { label: 'Rascunho', variant: 'neutro' },
  CONVIDADO: { label: 'Convidado', variant: 'atencao' },
  ACEITO: { label: '✓ Aceito', variant: 'sucesso' },
  RECUSADO: { label: '✕ Recusou', variant: 'perigo' },
  DESISTIU: { label: '✕ Desistiu', variant: 'perigo' },
  SUBSTITUIDO: { label: 'Substituído', variant: 'neutro' },
};

export function AlocacaoStatusBadge({ status }: { status: StatusConvite }) {
  const estilo = ESTILOS[status];
  return (
    <Badge variant={estilo.variant} className="whitespace-nowrap font-medium">
      {estilo.label}
    </Badge>
  );
}
