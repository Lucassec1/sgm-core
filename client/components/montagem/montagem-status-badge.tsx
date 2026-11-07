import { Badge } from '@/components/ui/badge';

// Status da montagem — o encontro em andamento é um dos dois lugares onde entra o ouro das
// equipes (o outro é o progresso de equipe); finalizada fica neutra.
export function MontagemStatusBadge({ status }: { status: string }) {
  return status === 'EM_ANDAMENTO' ? (
    <Badge variant="ouro" className="gap-1.5 font-medium">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ouro" />
      Em andamento
    </Badge>
  ) : (
    <Badge variant="neutro" className="font-medium">
      Finalizada
    </Badge>
  );
}
