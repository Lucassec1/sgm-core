'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { VagaAlocacoes } from './vaga-alocacoes';
import type { Alocacao, VagaMontagem } from '@/lib/types';

const STATUS_INATIVO = ['RECUSADO', 'DESISTIU', 'SUBSTITUIDO'];

function nomeAlocacao(alocacao: Alocacao) {
  return alocacao.ficha?.nomeCompleto ?? (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—');
}

function plural(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// Quanto falta pra fechar a equipe, separado por tipo — mesma conta do VagaAlocacoes,
// somada em todos os cargos da equipe.
function faltaDaEquipe(vagas: VagaMontagem[], alocacoesPorVaga: Map<string, Alocacao[]>) {
  let jovens = 0;
  let casais = 0;
  for (const vaga of vagas) {
    const ativas = (alocacoesPorVaga.get(vaga.id) ?? []).filter((a) => !STATUS_INATIVO.includes(a.status));
    const j = ativas.filter((a) => a.tipoPessoa === 'JOVEM').length;
    const c = ativas.filter((a) => a.tipoPessoa === 'CASAL').length;
    jovens += Math.max(0, vaga.quantidadeRapazes + vaga.quantidadeMocas - j);
    casais += Math.max(0, vaga.quantidadeCasais - c);
  }
  return { jovens, casais };
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
  readOnly = false,
}: {
  montagemId: string;
  gruposPorEquipe: VagaMontagem[][];
  alocacoesPorVaga: Map<string, Alocacao[]>;
  todasVagas: VagaMontagem[];
  todasAlocacoes: Alocacao[];
  encontroAnterior: number;
  readOnly?: boolean;
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
          const falta = faltaDaEquipe(vagas, alocacoesPorVaga);
          const completa = falta.jovens === 0 && falta.casais === 0;
          const resumoFalta = [
            falta.jovens > 0 && plural(falta.jovens, 'jovem', 'jovens'),
            falta.casais > 0 && plural(falta.casais, 'casal', 'casais'),
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <div key={vagas[0].equipeId}>
              <h3 className="flex items-center gap-2 text-base font-semibold border-b pb-1 mb-3">
                <EquipeIcon slug={equipe.slug} nome={equipe.nome} size={20} />
                <span>
                  {equipe.nome}{' '}
                  <span className={`text-sm font-normal ${completa ? 'text-green-600' : 'text-amber-600'}`}>
                    {completa ? '· completa' : `· faltam ${resumoFalta}`}
                  </span>
                </span>
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
                    readOnly={readOnly}
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
