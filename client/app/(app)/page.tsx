'use client';

import Link from 'next/link';
import { LayoutGrid, FileDown, UserRound, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFichas } from '@/lib/hooks/use-fichas';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import { useMontagens } from '@/lib/hooks/use-montagens';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';

export default function DashboardPage() {
  const { data: fichas } = useFichas({ paroquiaId: PAROQUIA_ID_PROVISORIA, pageSize: 1 });
  const { data: casais } = useFichasCasais({ paroquiaId: PAROQUIA_ID_PROVISORIA, pageSize: 1 });
  const { data: montagens } = useMontagens({ paroquiaId: PAROQUIA_ID_PROVISORIA, status: 'EM_ANDAMENTO', pageSize: 1 });
  const montagemAtual = montagens?.items[0];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Segue-me — diocese de Crato</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <CardDescription>{montagemAtual ? 'encontro em andamento' : 'nenhum encontro em andamento'}</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exportação</CardTitle>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>em breve</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
