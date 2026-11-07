import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import type { VagaMontagem, Alocacao } from '@/lib/types';
import { resumoEquipe } from '@/lib/montagem';
import { cn } from '@/lib/utils';

// Grid de Cards (não Accordion/Tree View) — equipes são paralelas entre si, exceto a
// dependência dos Círculos, tratada como aviso à parte (ver docs/ux-e-fluxos.md, seção 3).
// Equipe fechada (todo mundo aceitou) ganha o ouro das equipes — borda e barra — pra o quadro
// mostrar de longe o que já está resolvido (docs/design-system.md, seção 1).
export function EquipeCard({
  vagas,
  alocacoes,
  onClick,
}: {
  vagas: VagaMontagem[];
  alocacoes: Alocacao[];
  onClick?: () => void;
}) {
  const equipe = vagas[0]?.equipe;
  if (!equipe) return null;

  const { totalVagas, preenchidas, fechada } = resumoEquipe(vagas, alocacoes);
  const percentual = totalVagas > 0 ? Math.round((preenchidas / totalVagas) * 100) : 0;

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${equipe.nome}: ${preenchidas} de ${totalVagas} vagas` : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        fechada && 'border-ouro bg-ouro-suave/40',
        onClick &&
          'cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <EquipeIcon slug={equipe.slug} nome={equipe.nome} size={24} />
            <CardTitle className="text-sm font-semibold leading-tight">{equipe.nome}</CardTitle>
          </div>
          {equipe.ehCirculos && !fechada && (
            <Badge variant="outline" className="shrink-0 text-xs">
              1ª a convidar
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress
          value={percentual}
          className={fechada ? 'bg-ouro/25' : undefined}
          indicatorClassName={fechada ? 'bg-ouro' : undefined}
        />
        <p className="text-xs tabular-nums text-muted-foreground">
          {fechada
            ? `Todos os ${totalVagas} aceitaram`
            : `${preenchidas} de ${totalVagas} vagas preenchidas`}
        </p>
      </CardContent>
    </Card>
  );
}
