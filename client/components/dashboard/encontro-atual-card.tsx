'use client';

import Link from 'next/link';
import { BarChart3, LayoutGrid, Presentation } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Montagem } from '@/lib/types';

// A listagem de montagens não traz as vagas — o card só precisa do cabeçalho.
type MontagemResumida = Omit<Montagem, 'vagas'>;

// Atalhos do Dashboard pro que existe hoje em volta de uma Montagem: Telão (só faz sentido com
// encontro em andamento) e o resumo "como foi esse encontro" (só existe em montagem finalizada).
// Sem montagem nenhuma ainda, não mostra nada — o card "Montagem" acima já leva pra criar uma.
export function EncontroAtualCard({
  emAndamento,
  ultimaFinalizada,
}: {
  emAndamento?: MontagemResumida;
  ultimaFinalizada?: MontagemResumida;
}) {
  if (emAndamento) {
    return (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {emAndamento.numeroEncontro}º Encontro em andamento
            </CardTitle>
            <CardDescription>
              {new Date(emAndamento.data).toLocaleDateString('pt-BR')} · Quadro de equipes, convites
              e substituições
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" asChild>
              <Link href={`/montagem/${emAndamento.id}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
                Abrir montagem
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`/montagem/${emAndamento.id}/telao`} target="_blank">
                <Presentation className="h-3.5 w-3.5" />
                Modo telão
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

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
