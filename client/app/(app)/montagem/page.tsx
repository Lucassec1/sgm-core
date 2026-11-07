'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMontagens } from '@/lib/hooks/use-montagens';
import { NovaMontagemDialog } from '@/components/montagem/nova-montagem-dialog';
import { MontagemStatusBadge } from '@/components/montagem/montagem-status-badge';
import { MetaLista, PageHeader } from '@/components/page-header';

// Só existe uma montagem ativa por vez (ver docs/ux-e-fluxos.md, "Observações fechadas") —
// por isso a entrada do módulo é: mostra o encontro em andamento (se houver) e o histórico
// de encontros finalizados, sem seletor de "qual montagem" além disso.
export default function MontagemPage() {
  const { data, isLoading, isError } = useMontagens({ pageSize: 50 });

  const emAndamento = data?.items.find((m) => m.status === 'EM_ANDAMENTO');
  const finalizadas = data?.items.filter((m) => m.status === 'FINALIZADA') ?? [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Montagem" actions={!emAndamento && <NovaMontagemDialog />} />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar as montagens. Confira a conexão e recarregue a página.
        </p>
      )}

      {data && emAndamento && (
        <Link href={`/montagem/${emAndamento.id}`}>
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0">
              <CardTitle className="text-lg">{emAndamento.numeroEncontro}º Encontro</CardTitle>
              <MontagemStatusBadge status="EM_ANDAMENTO" />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <MetaLista
                itens={[
                  new Date(emAndamento.data).toLocaleDateString('pt-BR'),
                  emAndamento.padroeiro,
                  `${emAndamento.numeroJovensVivenciando} jovens vivenciando`,
                ]}
              />
            </CardContent>
          </Card>
        </Link>
      )}

      {data && !emAndamento && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Nenhum encontro em andamento. Use “Nova montagem” pra abrir o quadro das 16 equipes.
        </p>
      )}

      {finalizadas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-bold">Encontros anteriores</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {finalizadas.map((montagem) => (
              <Link key={montagem.id} href={`/montagem/${montagem.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {montagem.numeroEncontro}º Encontro
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {new Date(montagem.data).toLocaleDateString('pt-BR')}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
