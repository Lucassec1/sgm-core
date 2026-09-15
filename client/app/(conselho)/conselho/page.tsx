'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParoquias } from '@/lib/hooks/use-conselho';

// Seletor de paróquia (R8) — ponto de entrada do Conselho: escolhe uma paróquia pra ver as
// montagens dela. Sem paginação/busca sofisticada: uso interno de 12 pessoas, poucas
// paróquias (estimativa de 13, docs/regras-imutaveis.md R7).
export default function ConselhoPage() {
  const { data: paroquias, isLoading, isError } = useParoquias();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Paróquias</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-red-600">Não foi possível carregar as paróquias.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paroquias?.map((paroquia) => (
          <Link key={paroquia.id} href={`/conselho/paroquias/${paroquia.id}`}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle className="text-sm font-medium">{paroquia.nome}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {paroquia.usuarios.length > 0 ? 'Credencial ativa' : 'Sem credencial cadastrada'}
              </CardContent>
            </Card>
          </Link>
        ))}
        {paroquias?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma paróquia cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
