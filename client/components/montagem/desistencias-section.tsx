'use client';

import { useState } from 'react';

import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { nomeAlocacao, ordenarPorEquipe, STATUS_OCUPA_VAGA } from '@/lib/montagem';
import type { Alocacao, VagaMontagem } from '@/lib/types';
import { AlocacaoStatusBadge } from './alocacao-status-badge';
import { AlocarPessoaCombobox } from './alocar-pessoa-combobox';

// Pessoas que desistiram deste encontro — recusaram o convite ou desistiram depois de aceitar,
// independente do motivo (R1). Daqui dá pra escolher quem entra no lugar. Some quando a montagem
// é finalizada: ser substituto num encontro não influencia o próximo (R9).
export function DesistenciasSection({
  montagemId,
  alocacoes,
  todasVagas,
  readOnly = false,
}: {
  montagemId: string;
  alocacoes: Alocacao[];
  todasVagas: VagaMontagem[];
  readOnly?: boolean;
}) {
  const [substituindoVagaId, setSubstituindoVagaId] = useState<string | null>(null);

  const saidas = alocacoes
    .filter((a) => a.status === 'RECUSADO' || a.status === 'DESISTIU')
    .sort(ordenarPorEquipe);

  const idsAtivosNaVaga = (vagaId: string) =>
    new Set(
      alocacoes
        .filter((a) => a.vagaMontagemId === vagaId && STATUS_OCUPA_VAGA.includes(a.status))
        .map((a) => a.fichaId ?? a.fichaCasalId ?? ''),
    );

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-bold">Pessoas que desistiram</h2>
        <p className="text-sm text-muted-foreground">
          Recusaram o convite ou desistiram depois de aceitar, por qualquer motivo. Some quando a
          montagem é finalizada (R9).
        </p>
      </div>
      {saidas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguém desistiu deste encontro.</p>
      ) : (
        <ul className="space-y-2">
          {saidas.map((a) => {
            const vaga = todasVagas.find((v) => v.id === a.vagaMontagemId);
            const abrindo = substituindoVagaId === a.vagaMontagemId;
            return (
              <li key={a.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <AlocacaoStatusBadge status={a.status} />
                  <span className="font-medium">{nomeAlocacao(a)}</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <EquipeIcon
                      slug={a.vagaMontagem.equipe.slug}
                      nome={a.vagaMontagem.equipe.nome}
                      size={16}
                    />
                    {a.vagaMontagem.equipe.nome}, {a.vagaMontagem.cargo.nome}
                  </span>
                  {!readOnly && vaga && (
                    <button
                      type="button"
                      onClick={() => setSubstituindoVagaId(abrindo ? null : a.vagaMontagemId)}
                      className="ml-auto rounded text-xs font-bold underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {abrindo ? 'Fechar' : 'Substituir'}
                    </button>
                  )}
                </div>
                {a.motivoRecusa && (
                  <p className="mt-1 text-muted-foreground">Motivo: {a.motivoRecusa}</p>
                )}
                {!readOnly && vaga && abrindo && (
                  <div className="mt-2">
                    <AlocarPessoaCombobox
                      montagemId={montagemId}
                      vagaMontagemId={vaga.id}
                      equipeId={vaga.equipeId}
                      ehCoordenacao={
                        vaga.cargo.ehCoordenacao &&
                        (a.tipoPessoa === 'JOVEM' || vaga.equipe.coordenacaoCasalExigeHistorico)
                      }
                      tipoPessoa={a.tipoPessoa}
                      label={`Escolher quem entra (${a.tipoPessoa === 'CASAL' ? 'casal' : 'jovem'})`}
                      idsJaAlocados={idsAtivosNaVaga(vaga.id)}
                      todasVagas={todasVagas}
                      todasAlocacoes={alocacoes}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
