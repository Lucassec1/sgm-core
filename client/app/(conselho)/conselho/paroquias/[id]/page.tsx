'use client';

import { use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConselhoMontagens } from '@/lib/hooks/use-conselho';
import { MontagemStatusBadge } from '@/components/montagem/montagem-status-badge';
import { PageHeader } from '@/components/page-header';

export default function ConselhoParoquiaMontagensPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: paroquiaId } = use(params);
  const { data, isLoading, isError } = useConselhoMontagens({ paroquiaId });

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Montagens" />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar as montagens. Confira a conexão e recarregue a página.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((montagem) => (
          <Link key={montagem.id} href={`/conselho/montagem/${montagem.id}`}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">
                  {montagem.numeroEncontro}º Encontro
                </CardTitle>
                <MontagemStatusBadge status={montagem.status} />
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {new Date(montagem.data).toLocaleDateString('pt-BR')}
                {montagem.padroeiro && ` · ${montagem.padroeiro}`}
              </CardContent>
            </Card>
          </Link>
        ))}
        {data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma montagem encontrada pra essa paróquia.
          </p>
        )}
      </div>
    </div>
  );
}
