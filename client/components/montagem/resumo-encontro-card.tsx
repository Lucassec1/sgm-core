'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useResumoMontagem } from '@/lib/hooks/use-montagens';

// "Como foi esse encontro" — painel de resumo mostrado na Montagem finalizada
// (docs/propostas.md, proposta #2). Lê o LogAtividade (R9) e as Alocacoes já existentes,
// sem schema novo — ver a nota no topo de `MontagensService.resumo()` sobre as duas métricas
// do escopo original que não são calculáveis com o que o log guarda hoje.
function formatarDuracao(ms: number | null): string {
  if (ms == null) return '—';
  const horas = Math.round(ms / (1000 * 60 * 60));
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  const restoHoras = horas % 24;
  return restoHoras > 0 ? `${dias}d ${restoHoras}h` : `${dias}d`;
}

export function ResumoEncontroCard({ montagemId }: { montagemId: string }) {
  const { data: resumo, isLoading } = useResumoMontagem(montagemId);

  if (isLoading || !resumo) return null;

  const anterioresComDuracao = resumo.historico.filter((h) => h.duracaoMs != null);
  const mediaAnterioresMs = anterioresComDuracao.length
    ? anterioresComDuracao.reduce((soma, h) => soma + (h.duracaoMs as number), 0) / anterioresComDuracao.length
    : null;
  const linhaDoTempo = [...resumo.historico, { numeroEncontro: resumo.numeroEncontro, duracaoMs: resumo.duracaoMs }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como foi esse encontro</CardTitle>
        <CardDescription>
          {anterioresComDuracao.length > 0
            ? `A partir do log de atividade — comparado com os ${anterioresComDuracao.length} encontro(s) finalizado(s) anteriores da paróquia.`
            : 'A partir do log de atividade. Ainda não há encontros finalizados anteriores da paróquia pra comparar.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Tempo até finalizar</p>
          <p className="text-2xl font-semibold">{formatarDuracao(resumo.duracaoMs)}</p>
          {mediaAnterioresMs != null && (
            <p className="text-xs text-muted-foreground">média dos anteriores: {formatarDuracao(mediaAnterioresMs)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Equipe com mais movimentação</p>
          <p className="text-lg font-medium">{resumo.equipeMaisMovimentada?.nome ?? '—'}</p>
          {resumo.equipeMaisMovimentada && (
            <p className="text-xs text-muted-foreground">{resumo.equipeMaisMovimentada.movimentacoes} idas e vindas</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Recusas / desistências</p>
          <p className="text-2xl font-semibold">{resumo.totalRecusasDesistencias}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Substituições</p>
          <p className="text-2xl font-semibold">{resumo.totalSubstituicoes}</p>
        </div>
      </CardContent>

      {linhaDoTempo.length > 1 && (
        <CardContent className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-sm">
          {linhaDoTempo.map((h) => (
            <span
              key={h.numeroEncontro}
              className={h.numeroEncontro === resumo.numeroEncontro ? 'font-semibold' : 'text-muted-foreground'}
            >
              nº {h.numeroEncontro}: {formatarDuracao(h.duracaoMs)}
            </span>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
