'use client';

import Link from 'next/link';
import { LayoutGrid, UserRound, Users } from 'lucide-react';

import { EncontroAtualCard } from '@/components/dashboard/encontro-atual-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFichas } from '@/lib/hooks/use-fichas';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import { useMontagens } from '@/lib/hooks/use-montagens';

export default function DashboardPage() {
  const { data: fichas } = useFichas({ pageSize: 1 });
  const { data: casais } = useFichasCasais({ pageSize: 1 });
  const { data: montagens } = useMontagens({ status: 'EM_ANDAMENTO', pageSize: 1 });
  const montagemAtual = montagens?.items[0];
  // Lista vem ordenada por numeroEncontro desc — o primeiro é o último finalizado. Só busca se não
  // houver encontro em andamento (aí o card de atalhos mostra o atual, não o anterior).
  const { data: finalizadas } = useMontagens(
    { status: 'FINALIZADA', pageSize: 1 },
    { enabled: !!montagens && !montagemAtual },
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Segue-me — diocese de Crato</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/fichas">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fichas — Jovens</CardTitle>
              <UserRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{fichas?.total ?? '—'}</div>
              <CardDescription>fichas cadastradas</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/fichas/casais">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fichas — Casais</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{casais?.total ?? '—'}</div>
              <CardDescription>casais cadastrados</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href={montagemAtual ? `/montagem/${montagemAtual.id}` : '/montagem'}>
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Montagem</CardTitle>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {montagemAtual ? `${montagemAtual.numeroEncontro}º` : '—'}
              </div>
              <CardDescription>
                {montagemAtual ? 'encontro em andamento' : 'nenhum encontro em andamento'}
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      <EncontroAtualCard emAndamento={montagemAtual} ultimaFinalizada={finalizadas?.items[0]} />
    </div>
  );
}
