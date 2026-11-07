'use client';

import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { MontagemStatusBadge } from '@/components/montagem/montagem-status-badge';
import { MetaLista } from '@/components/page-header';
import { useAlocacoes, useMontagem } from '@/lib/hooks/use-montagens';
import { resumoEquipe } from '@/lib/montagem';
import { agruparVagasPorEquipe } from '@/lib/utils';
import type { Alocacao, Equipe } from '@/lib/types';
import type { ResumoEquipe } from '@/lib/montagem';

// Abertura do Início: o encontro em andamento, não contadores. Cada equipe (ícone + nome, nunca
// o ícone sozinho — docs/design-system.md) acende em ouro quando fecha; embaixo, o próximo passo que a montagem pede (R4 primeiro).
export function PainelEncontro({ montagemId }: { montagemId: string }) {
  const { data: montagem } = useMontagem(montagemId);
  const { data: alocacoes } = useAlocacoes(montagemId);
  if (!montagem) return null;

  const porVaga = new Map<string, Alocacao[]>();
  for (const a of alocacoes ?? []) {
    porVaga.set(a.vagaMontagemId, [...(porVaga.get(a.vagaMontagemId) ?? []), a]);
  }
  const equipes = agruparVagasPorEquipe(montagem.vagas).map((vagas) => ({
    equipe: vagas[0].equipe,
    ...resumoEquipe(
      vagas,
      vagas.flatMap((v) => porVaga.get(v.id) ?? []),
    ),
  }));
  const fechadas = equipes.filter((e) => e.fechada).length;

  const passo = proximoPasso(equipes);

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {montagem.numeroEncontro}º Encontro
              </h2>
              <MontagemStatusBadge status={montagem.status} />
            </div>
            <div className="text-sm text-muted-foreground">
              <MetaLista
                itens={[
                  new Date(montagem.data).toLocaleDateString('pt-BR'),
                  montagem.padroeiro,
                  `${montagem.numeroJovensVivenciando} jovens vivenciando`,
                ]}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" asChild>
              <Link href={`/montagem/${montagem.id}`}>
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Abrir montagem
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <ul
            className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Equipes do encontro"
          >
            {equipes.map((e) => (
              <li
                key={e.equipe.id}
                className={
                  e.fechada
                    ? 'flex min-w-0 items-center gap-2 rounded-md border border-ouro bg-ouro-suave px-2 py-1.5 text-ouro-foreground'
                    : 'flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-muted-foreground'
                }
              >
                <EquipeIcon
                  slug={e.equipe.slug}
                  size={20}
                  className={e.fechada ? undefined : 'opacity-60 grayscale'}
                />
                <span className="truncate text-xs font-medium">{e.equipe.nome}</span>
                <span className="ml-auto shrink-0 text-xs tabular-nums">
                  {e.fechada ? '✓' : `${e.aceitas}/${e.totalVagas}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm tabular-nums">
            <span className="font-bold">{fechadas}</span> de {equipes.length} equipes fechadas
          </p>
        </div>

        <p className="rounded-md bg-muted px-4 py-3 text-sm">
          <span className="font-bold">Próximo passo: </span>
          {passo}
        </p>
      </CardContent>
    </Card>
  );
}

type EquipeResumida = ResumoEquipe & { equipe: Pick<Equipe, 'nome' | 'ehCirculos'> };

// O que a montagem pede agora: R4 primeiro (Círculos fecham antes de convidar as outras); depois,
// a equipe com mais vagas em aberto; por fim, finalizar.
export function proximoPasso(equipes: EquipeResumida[]): string {
  const circulos = equipes.find((e) => e.equipe.ehCirculos);
  if (circulos && !circulos.fechada) {
    return `Feche primeiro a ${circulos.equipe.nome}: ${circulos.aceitas} de ${circulos.totalVagas} aceitaram. As outras equipes só devem ser convidadas depois (R4).`;
  }
  const abertas = equipes.filter((e) => !e.fechada);
  if (abertas.length > 0) {
    const maisAberta = [...abertas].sort(
      (a, b) => b.totalVagas - b.aceitas - (a.totalVagas - a.aceitas),
    )[0];
    return `Faltam ${abertas.length} equipes. A que tem mais vagas em aberto é a ${maisAberta.equipe.nome} (${maisAberta.totalVagas - maisAberta.aceitas}).`;
  }
  return 'Todas as equipes fecharam. Confira a lista completa e finalize a montagem.';
}
