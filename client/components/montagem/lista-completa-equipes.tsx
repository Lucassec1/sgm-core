'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { VagaAlocacoes } from './vaga-alocacoes';
import type { Alocacao, VagaMontagem } from '@/lib/types';

function nomeAlocacao(alocacao: Alocacao) {
  return alocacao.ficha?.nomeCompleto ?? (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—');
}

// Lista por extenso — mesmas equipes do Quadro em Cards, mas em texto corrido, uma equipe
// abaixo da outra, com os mesmos poderes da Drawer (adicionar/remover/avaliar) — pra não
// precisar abrir cada equipe separadamente pra conferir ou ajustar a distribuição.
export function ListaCompletaEquipes({
  montagemId,
  gruposPorEquipe,
  alocacoesPorVaga,
  todasVagas,
  todasAlocacoes,
  encontroAnterior,
}: {
  montagemId: string;
  gruposPorEquipe: VagaMontagem[][];
  alocacoesPorVaga: Map<string, Alocacao[]>;
  todasVagas: VagaMontagem[];
  todasAlocacoes: Alocacao[];
  encontroAnterior: number;
}) {
  const [busca, setBusca] = useState('');
  const buscaNormalizada = busca.trim().toLowerCase();

  const gruposFiltrados = buscaNormalizada
    ? gruposPorEquipe.filter((vagas) =>
        vagas
          .flatMap((v) => alocacoesPorVaga.get(v.id) ?? [])
          .some((a) => nomeAlocacao(a).toLowerCase().includes(buscaNormalizada)),
      )
    : gruposPorEquipe;

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar pessoa (mostra a equipe dela)..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-8"
        />
      </div>

      {buscaNormalizada && gruposFiltrados.length === 0 && (
        <p className="text-sm text-muted-foreground">Ninguém alocado com esse nome.</p>
      )}

      <div className="space-y-8">
        {gruposFiltrados.map((vagas) => {
          const equipe = vagas[0].equipe;
          const totalPessoas = vagas
            .flatMap((v) => alocacoesPorVaga.get(v.id) ?? [])
            .filter((a) => !['RECUSADO', 'DESISTIU', 'SUBSTITUIDO'].includes(a.status)).length;

          return (
            <div key={vagas[0].equipeId}>
              <h3 className="text-base font-semibold border-b pb-1 mb-3">
                {equipe.nome} <span className="text-sm font-normal text-muted-foreground">({totalPessoas} pessoa(s))</span>
              </h3>
              <div className="space-y-4">
                {vagas.map((vaga) => (
                  <VagaAlocacoes
                    key={vaga.id}
                    montagemId={montagemId}
                    vaga={vaga}
                    alocacoes={alocacoesPorVaga.get(vaga.id) ?? []}
                    todasVagas={todasVagas}
                    todasAlocacoes={todasAlocacoes}
                    encontroAnterior={encontroAnterior}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
