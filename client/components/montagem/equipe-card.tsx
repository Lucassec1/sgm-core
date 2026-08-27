import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import type { VagaMontagem, Alocacao } from '@/lib/types';

// Uma alocação ainda ocupa a vaga enquanto não foi recusada/desistida/substituída — mesmo
// em RASCUNHO, já dá pra contar como "preenchida" (a equipe dirigente rascunha a distribuição
// antes de formalizar o convite, ver docs/ux-e-fluxos.md, seção 1.2).
const STATUS_OCUPA_VAGA = ['RASCUNHO', 'CONVIDADO', 'ACEITO'];

// Grid de Cards (não Accordion/Tree View) — equipes são paralelas entre si, exceto a
// dependência dos Círculos, tratada como aviso à parte (ver docs/ux-e-fluxos.md, seção 3).
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

  const totalVagas = vagas.reduce((soma, v) => soma + v.quantidadeCasais + v.quantidadeRapazes + v.quantidadeMocas, 0);
  const preenchidas = alocacoes.filter((a) => STATUS_OCUPA_VAGA.includes(a.status)).length;
  const percentual = totalVagas > 0 ? Math.round((preenchidas / totalVagas) * 100) : 0;

  return (
    <Card
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={onClick ? 'cursor-pointer transition-colors hover:bg-accent/50' : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <EquipeIcon slug={equipe.slug} nome={equipe.nome} size={24} />
            <CardTitle className="text-sm font-medium leading-tight">{equipe.nome}</CardTitle>
          </div>
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
