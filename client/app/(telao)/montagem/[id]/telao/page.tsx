'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { useTelaoMontagem } from '@/lib/hooks/use-telao';

// Modo telão / impressão do Quadro de Equipes (docs/historico/propostas.md, proposta #5) — visão
// somente-leitura, grande, SEM dado sensível: só nome + equipe + função. Nada de telefone,
// endereço, avaliação ou ações de edição. Vive fora do grupo (app) de propósito (sem
// Sidebar/header) — é pensada pra projetar num telão ou imprimir e colar no mural. Público
// (sem login) — ver server/src/modules/telao — por isso usa um endpoint dedicado que já
// devolve só o necessário (só ACEITOS, um único request em vez de dois).
type TelaoVaga = NonNullable<ReturnType<typeof useTelaoMontagem>['data']>['vagas'][number];

function nomeAlocacao(alocacao: TelaoVaga['alocacoes'][number]) {
  return (
    alocacao.ficha?.nomeCompleto ??
    (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—')
  );
}

function agruparPorEquipe(vagas: TelaoVaga[]) {
  const grupos = new Map<string, TelaoVaga[]>();
  for (const vaga of vagas) {
    const lista = grupos.get(vaga.equipe.id) ?? [];
    lista.push(vaga);
    grupos.set(vaga.equipe.id, lista);
  }
  return [...grupos.values()].sort((a, b) => a[0].equipe.ordem - b[0].equipe.ordem);
}

export default function TelaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: montagem, isLoading, isError } = useTelaoMontagem(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !montagem)
    return <p className="p-6 text-sm text-red-600">Não foi possível carregar a montagem.</p>;

  const gruposPorEquipe = agruparPorEquipe(montagem.vagas);

  return (
    <div className="mx-auto max-w-6xl p-6 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link href={`/montagem/${id}`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />
          Imprimir
        </Button>
      </div>

      <div className="mb-6 text-center print:mb-8">
        <h1 className="text-2xl font-bold print:text-3xl">Quadro de Equipes</h1>
        <p className="text-muted-foreground print:text-black">
          {montagem.numeroEncontro}º Encontro ·{' '}
          {new Date(montagem.data).toLocaleDateString('pt-BR')}
          {montagem.padroeiro && ` · ${montagem.padroeiro}`}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        {gruposPorEquipe.map((vagas) => (
          <BlocoEquipe key={vagas[0].equipe.id} vagas={vagas} />
        ))}
      </div>
    </div>
  );
}

function BlocoEquipe({ vagas }: { vagas: TelaoVaga[] }) {
  const { equipe } = vagas[0];
  const cargos = [...vagas].sort((a, b) => a.cargo.ordem - b.cargo.ordem);

  return (
    <div className="break-inside-avoid rounded-lg border p-4 print:border-black/30">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold print:text-black">
        <EquipeIcon slug={equipe.slug} nome={equipe.nome} size={24} />
        {equipe.nome}
      </h2>
      <div className="space-y-2">
        {cargos.map((vaga) => {
          const nomes = vaga.alocacoes.map(nomeAlocacao);
          return (
            <div key={vaga.id} className="text-sm print:text-black">
              <span className="font-medium">{vaga.cargo.nome}:</span>{' '}
              {nomes.length > 0 ? (
                <span>{nomes.join(', ')}</span>
              ) : (
                <span className="italic text-muted-foreground print:text-black/60">
                  a confirmar
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
