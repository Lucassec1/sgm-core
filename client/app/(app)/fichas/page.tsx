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
import { useFichas } from '@/lib/hooks/use-fichas';
import { CirculoBadge } from '@/components/fichas/circulo-badge';
import { StatusBadge } from '@/components/fichas/status-badge';
import { FichasFiltros, type FiltrosFichas } from '@/components/fichas/fichas-filtros';
import { FichasTabsNav } from '@/components/fichas/fichas-tabs-nav';
import { UploadFotosLoteDialog } from '@/components/fichas/upload-fotos-lote-dialog';
import { fotoSrc, iniciais } from '@/lib/utils';

export default function FichasListPage() {
  const [filtros, setFiltros] = useState<FiltrosFichas>({});

  const { data, isLoading, isError } = useFichas({ ...filtros });

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Fichas"
        actions={
          <>
            <UploadFotosLoteDialog tipo="jovem" />
            <Button asChild>
              <Link href="/fichas/novo">Nova ficha</Link>
            </Button>
          </>
        }
      />

      <FichasTabsNav />

      <FichasFiltros value={filtros} onChange={setFiltros} />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar as fichas. Confira a conexão e recarregue a página.
        </p>
      )}

      {data && (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-12 sm:table-cell"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Encontro</TableHead>
                <TableHead>Círculo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((ficha) => (
                <TableRow key={ficha.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Avatar>
                      <AvatarImage src={fotoSrc(ficha.fotoUrl)} alt={ficha.nomeCompleto} />
                      <AvatarFallback>{iniciais(ficha.nomeCompleto)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Link href={`/fichas/${ficha.id}`} className="font-medium hover:underline">
                      {ficha.nomeCompleto}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {ficha.numeroEncontro}º Encontro
                  </TableCell>
                  <TableCell>
                    <CirculoBadge cor={ficha.corCirculo} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge situacao={ficha.situacao} />
                  </TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma ficha com esses filtros. Limpe a busca ou cadastre uma nova ficha.
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
