'use client';

import Link from 'next/link';
import { UserRound, Users } from 'lucide-react';

import { EncontroAtualCard } from '@/components/dashboard/encontro-atual-card';
import { PainelEncontro } from '@/components/dashboard/painel-encontro';
import { NovaMontagemDialog } from '@/components/montagem/nova-montagem-dialog';
import { PageHeader } from '@/components/page-header';
import { useFichas } from '@/lib/hooks/use-fichas';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import { useMontagens } from '@/lib/hooks/use-montagens';

// Início: o encontro em andamento vem primeiro (é o que a equipe dirigente precisa saber ao
// abrir o sistema); os totais de fichas ficam em segundo plano, como atalho.
export default function DashboardPage() {
  const { data: fichas } = useFichas({ pageSize: 1 });
  const { data: casais } = useFichasCasais({ pageSize: 1 });
  const { data: montagens } = useMontagens({ status: 'EM_ANDAMENTO', pageSize: 1 });
  const montagemAtual = montagens?.items[0];
  // Lista vem ordenada por numeroEncontro desc — o primeiro é o último finalizado. Só busca se não
  // houver encontro em andamento (aí o painel mostra o atual, não o anterior).
  const { data: finalizadas } = useMontagens(
    { status: 'FINALIZADA', pageSize: 1 },
    { enabled: !!montagens && !montagemAtual },
  );
  const semNenhumEncontro = !!montagens && !montagemAtual && finalizadas?.items.length === 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Início" />

      {montagemAtual ? (
        <PainelEncontro montagemId={montagemAtual.id} />
      ) : (
        <EncontroAtualCard ultimaFinalizada={finalizadas?.items[0]} />
      )}

      {semNenhumEncontro && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p className="text-sm">
            Nenhum encontro cadastrado ainda. Comece criando a montagem do próximo encontro.
          </p>
          <NovaMontagemDialog />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <AtalhoFichas
          href="/fichas"
          icone={<UserRound className="h-4 w-4" aria-hidden />}
          total={fichas?.total}
          rotulo="fichas de jovens"
        />
        <AtalhoFichas
          href="/fichas/casais"
          icone={<Users className="h-4 w-4" aria-hidden />}
          total={casais?.total}
          rotulo="fichas de casais"
        />
      </div>
    </div>
  );
}

function AtalhoFichas({
  href,
  icone,
  total,
  rotulo,
}: {
  href: string;
  icone: React.ReactNode;
  total?: number;
  rotulo: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-muted-foreground">{icone}</span>
      <span>
        <span className="font-bold tabular-nums">{total ?? '—'}</span> {rotulo}
      </span>
    </Link>
  );
}
