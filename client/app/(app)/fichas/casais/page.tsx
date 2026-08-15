'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { StatusBadge } from '@/components/fichas/status-badge';
import { FichasCasaisFiltros, type FiltrosFichasCasais } from '@/components/fichas/fichas-casais-filtros';
import { FichasTabsNav } from '@/components/fichas/fichas-tabs-nav';

export default function FichasCasaisListPage() {
  const [filtros, setFiltros] = useState<FiltrosFichasCasais>({});

  const { data, isLoading, isError } = useFichasCasais({ paroquiaId: PAROQUIA_ID_PROVISORIA, ...filtros });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Fichas</h1>
        <Button asChild>
          <Link href="/fichas/casais/novo">Novo Casal</Link>
        </Button>
      </div>

      <FichasTabsNav />

      <FichasCasaisFiltros value={filtros} onChange={setFiltros} />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-red-600">Não foi possível carregar os casais.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((casal) => (
              <TableRow key={casal.id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={casal.fotoUrl ?? undefined} alt={casal.nomeEle} />
                    <AvatarFallback>{casal.nomeEle.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Link href={`/fichas/casais/${casal.id}`} className="font-medium hover:underline">
                    {casal.nomeEle} & {casal.nomeEla}
                  </Link>
                </TableCell>
                <TableCell>{casal.telefoneEle}</TableCell>
                <TableCell>
                  <StatusBadge situacao={casal.situacao} />
                </TableCell>
              </TableRow>
            ))}
            {data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum casal encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
