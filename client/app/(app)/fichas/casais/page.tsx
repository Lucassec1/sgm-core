'use client';

import { PageHeader } from '@/components/page-header';
import { useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import { StatusBadge } from '@/components/fichas/status-badge';
import {
  FichasCasaisFiltros,
  type FiltrosFichasCasais,
} from '@/components/fichas/fichas-casais-filtros';
import { FichasTabsNav } from '@/components/fichas/fichas-tabs-nav';
import { UploadFotosLoteDialog } from '@/components/fichas/upload-fotos-lote-dialog';
import { fotoSrc, iniciais } from '@/lib/utils';

export default function FichasCasaisListPage() {
  const [filtros, setFiltros] = useState<FiltrosFichasCasais>({});

  const { data, isLoading, isError } = useFichasCasais({ ...filtros });

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Fichas"
        actions={
          <>
            <UploadFotosLoteDialog tipo="casal" />
            <Button asChild>
              <Link href="/fichas/casais/novo">Novo casal</Link>
            </Button>
          </>
        }
      />

      <FichasTabsNav />

      <FichasCasaisFiltros value={filtros} onChange={setFiltros} />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar os casais. Confira a conexão e recarregue a página.
        </p>
      )}

      {data && (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-12 sm:table-cell"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((casal) => (
                <TableRow key={casal.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Avatar>
                      <AvatarImage src={fotoSrc(casal.fotoUrl)} alt={casal.nomeEle} />
                      <AvatarFallback>{iniciais(casal.nomeEle, casal.nomeEla)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/fichas/casais/${casal.id}`}
                      className="font-medium hover:underline"
                    >
                      {casal.nomeEle} e {casal.nomeEla}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">
                    {casal.telefoneEle}
                  </TableCell>
                  <TableCell>
                    <StatusBadge situacao={casal.situacao} />
                  </TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum casal com esses filtros. Limpe a busca ou cadastre um novo casal.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
