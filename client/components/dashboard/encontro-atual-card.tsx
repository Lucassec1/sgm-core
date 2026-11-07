'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Montagem } from '@/lib/types';

// A listagem de montagens não traz as vagas — o card só precisa do cabeçalho.
type MontagemResumida = Omit<Montagem, 'vagas'>;

// Sem encontro em andamento, o Início aponta pro último finalizado e o resumo "como foi esse
// encontro". Com encontro em andamento, quem aparece é o PainelEncontro.
export function EncontroAtualCard({ ultimaFinalizada }: { ultimaFinalizada?: MontagemResumida }) {
  if (ultimaFinalizada) {
    return (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              Último encontro: {ultimaFinalizada.numeroEncontro}º (finalizado)
            </CardTitle>
            <CardDescription>
              Veja como foi: tempo até finalizar, recusas, substituições e a equipe com mais
              movimentação.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/montagem/${ultimaFinalizada.id}`}>
              <BarChart3 className="h-3.5 w-3.5" />
              Ver resumo
            </Link>
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return null;
}
