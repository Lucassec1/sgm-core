'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { useAlocacoes, useMontagem } from '@/lib/hooks/use-montagens';
import { agruparVagasPorEquipe } from '@/lib/utils';
import type { Alocacao, VagaMontagem } from '@/lib/types';

// Modo telão / impressão do Quadro de Equipes (docs/propostas.md, proposta #5) — visão
// somente-leitura, grande, SEM dado sensível: só nome + equipe + função. Nada de telefone,
// endereço, avaliação ou ações de edição. Vive fora do grupo (app) de propósito (sem
// Sidebar/header) — é pensada pra projetar num telão ou imprimir e colar no mural.
function nomeAlocacao(alocacao: Alocacao) {
  return (
    alocacao.ficha?.nomeCompleto ??
    (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—')
  );
}

export default function TelaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: montagem, isLoading, isError } = useMontagem(id);
  const { data: alocacoes } = useAlocacoes(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !montagem) return <p className="p-6 text-sm text-red-600">Não foi possível carregar a montagem.</p>;

  const alocacoesPorVaga = new Map<string, Alocacao[]>();
  for (const alocacao of alocacoes ?? []) {
    if (alocacao.status !== 'ACEITO') continue;
    const lista = alocacoesPorVaga.get(alocacao.vagaMontagemId) ?? [];
    lista.push(alocacao);
    alocacoesPorVaga.set(alocacao.vagaMontagemId, lista);
  }

  const gruposPorEquipe = agruparVagasPorEquipe(montagem.vagas);

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
          {montagem.numeroEncontro}º Encontro · {new Date(montagem.data).toLocaleDateString('pt-BR')}
          {montagem.padroeiro && ` · ${montagem.padroeiro}`}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        {gruposPorEquipe.map((vagas) => (
          <BlocoEquipe key={vagas[0].equipeId} vagas={vagas} alocacoesPorVaga={alocacoesPorVaga} />
        ))}
      </div>
    </div>
  );
}

function BlocoEquipe({ vagas, alocacoesPorVaga }: { vagas: VagaMontagem[]; alocacoesPorVaga: Map<string, Alocacao[]> }) {
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
          const nomes = (alocacoesPorVaga.get(vaga.id) ?? []).map(nomeAlocacao);
          return (
            <div key={vaga.id} className="text-sm print:text-black">
              <span className="font-medium">{vaga.cargo.nome}:</span>{' '}
              {nomes.length > 0 ? (
                <span>{nomes.join(', ')}</span>
              ) : (
                <span className="italic text-muted-foreground print:text-black/60">a confirmar</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
