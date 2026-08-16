import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { VagaMontagem, Alocacao } from '@/lib/types';

// Grid de Cards (não Accordion/Tree View) — equipes são paralelas entre si, exceto a
// dependência dos Círculos, tratada como aviso à parte (ver docs/ux-e-fluxos.md, seção 3).
export function EquipeCard({ vagas, alocacoes }: { vagas: VagaMontagem[]; alocacoes: Alocacao[] }) {
  const equipe = vagas[0]?.equipe;
  if (!equipe) return null;

  const totalVagas = vagas.reduce((soma, v) => soma + v.quantidadeCasais + v.quantidadeRapazes + v.quantidadeMocas, 0);
  const preenchidas = alocacoes.filter((a) => a.status === 'ACEITO').length;
  const percentual = totalVagas > 0 ? Math.round((preenchidas / totalVagas) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight">{equipe.nome}</CardTitle>
          {equipe.ehCirculos && (
            <Badge variant="outline" className="shrink-0 text-xs">
              1ª a convidar
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={percentual} />
        <p className="text-xs text-muted-foreground">
          {preenchidas} / {totalVagas} vagas preenchidas
        </p>
      </CardContent>
    </Card>
  );
}
