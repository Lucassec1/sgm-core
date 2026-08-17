'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { useMontagens } from '@/lib/hooks/use-montagens';
import { NovaMontagemDialog } from '@/components/montagem/nova-montagem-dialog';

// Só existe uma montagem ativa por vez (ver docs/ux-e-fluxos.md, "Observações fechadas") —
// por isso a entrada do módulo é: mostra o encontro em andamento (se houver) e o histórico
// de encontros finalizados, sem seletor de "qual montagem" além disso.
export default function MontagemPage() {
  const { data, isLoading, isError } = useMontagens({ paroquiaId: PAROQUIA_ID_PROVISORIA, pageSize: 50 });

  const emAndamento = data?.items.find((m) => m.status === 'EM_ANDAMENTO');
  const finalizadas = data?.items.filter((m) => m.status === 'FINALIZADA') ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Montagem</h1>
        {!emAndamento && <NovaMontagemDialog />}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-red-600">Não foi possível carregar as montagens.</p>}

      {data && emAndamento && (
        <Link href={`/montagem/${emAndamento.id}`}>
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{emAndamento.numeroEncontro}º Encontro — em andamento</CardTitle>
              <Badge>Em andamento</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {new Date(emAndamento.data).toLocaleDateString('pt-BR')}
              {emAndamento.padroeiro && ` · ${emAndamento.padroeiro}`} · {emAndamento.numeroJovensVivenciando} jovens vivenciando
            </CardContent>
          </Card>
        </Link>
      )}

      {data && !emAndamento && !isLoading && (
        <p className="text-sm text-muted-foreground">Nenhuma montagem em andamento. Clique em &quot;Nova Montagem&quot; pra abrir o quadro das 16 equipes.</p>
      )}

      {finalizadas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Histórico</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {finalizadas.map((montagem) => (
              <Link key={montagem.id} href={`/montagem/${montagem.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{montagem.numeroEncontro}º Encontro</CardTitle>
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
