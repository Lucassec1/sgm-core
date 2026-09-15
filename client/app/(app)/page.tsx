'use client';

import Link from 'next/link';
import { LayoutGrid, FileDown, UserRound, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFichas } from '@/lib/hooks/use-fichas';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import { useMontagens } from '@/lib/hooks/use-montagens';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const { data: fichas } = useFichas({ pageSize: 1 });
  const { data: casais } = useFichasCasais({ pageSize: 1 });
  const { data: montagens } = useMontagens({ status: 'EM_ANDAMENTO', pageSize: 1 });
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exportação</CardTitle>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-1">baixar dados em CSV</CardDescription>
            <div className="flex flex-col gap-1 text-sm">
              <a
                className="text-primary hover:underline"
                href={apiClient.exportFichasUrl()}
              >
                Fichas — Jovens
              </a>
              <a
                className="text-primary hover:underline"
                href={apiClient.exportFichasCasaisUrl()}
              >
                Fichas — Casais
              </a>
              {montagemAtual && (
                <a
                  className="text-primary hover:underline"
                  href={apiClient.exportMontagemUrl(montagemAtual.id)}
                >
                  Montagem atual
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
