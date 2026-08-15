'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFichas } from '@/lib/hooks/use-fichas';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { CirculoBadge } from '@/components/fichas/circulo-badge';
import { StatusBadge } from '@/components/fichas/status-badge';
import { FichasFiltros, type FiltrosFichas } from '@/components/fichas/fichas-filtros';
import { FichasTabsNav } from '@/components/fichas/fichas-tabs-nav';

export default function FichasListPage() {
  const [filtros, setFiltros] = useState<FiltrosFichas>({});

  const { data, isLoading, isError } = useFichas({ paroquiaId: PAROQUIA_ID_PROVISORIA, ...filtros });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Fichas</h1>
        <Button asChild>
          <Link href="/fichas/novo">Nova Ficha</Link>
        </Button>
      </div>

      <FichasTabsNav />

      <FichasFiltros value={filtros} onChange={setFiltros} />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-red-600">Não foi possível carregar as fichas.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Encontro</TableHead>
              <TableHead>Círculo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((ficha) => (
              <TableRow key={ficha.id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={ficha.fotoUrl ?? undefined} alt={ficha.nomeCompleto} />
                    <AvatarFallback>{ficha.nomeCompleto.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Link href={`/fichas/${ficha.id}`} className="font-medium hover:underline">
                    {ficha.nomeCompleto}
                  </Link>
                </TableCell>
                <TableCell>{ficha.numeroEncontro}º Encontro</TableCell>
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
                  Nenhuma ficha encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
