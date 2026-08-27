'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CirculoBadge } from '@/components/fichas/circulo-badge';
import { useDeleteAlocacao } from '@/lib/hooks/use-montagens';
import { AlocacaoAvaliacaoPopover } from './alocacao-avaliacao-popover';
import { AlocacaoRowActions } from './alocacao-row-actions';
import { AlocacaoStatusBadge } from './alocacao-status-badge';
import { AlocarPessoaCombobox } from './alocar-pessoa-combobox';
import { PessoaPreviewPopover } from './pessoa-preview-popover';
import type { Alocacao, VagaMontagem } from '@/lib/types';

const STATUS_INATIVO = ['RECUSADO', 'DESISTIU', 'SUBSTITUIDO'];

function nomeAlocacao(alocacao: Alocacao) {
  return alocacao.ficha?.nomeCompleto ?? (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—');
}

function plural(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// Uma linha da lista de alocados (reaproveitada nos blocos de Casais e de Jovens).
function LinhaAlocacao({
  montagemId,
  vaga,
  alocacao,
  encontroAnterior,
  readOnly,
  onRemover,
}: {
  montagemId: string;
  vaga: VagaMontagem;
  alocacao: Alocacao;
  encontroAnterior: number;
  readOnly: boolean;
  onRemover: (id: string) => void;
}) {
  // Badge de círculo só pra quem vivenciou o encontro imediatamente anterior — ajuda a
  // conferir que todo mundo que "deve" servir pela primeira vez está mesmo aqui (R5).
  const destacarCirculo = alocacao.ficha?.numeroEncontro === encontroAnterior;

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 truncate">
          <PessoaPreviewPopover ficha={alocacao.ficha} fichaCasal={alocacao.fichaCasal}>
            {nomeAlocacao(alocacao)}
          </PessoaPreviewPopover>
        </div>
        {destacarCirculo && alocacao.ficha && <CirculoBadge cor={alocacao.ficha.corCirculo} />}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AlocacaoStatusBadge status={alocacao.status} />
        {!readOnly && (
          <>
            <AlocacaoRowActions montagemId={montagemId} alocacao={alocacao} />
            {/* Cargo de Coordenação (inclusive Comandantes Gerais/Jovens do Comando Geral) não
                passa por avaliação aqui — pra chegar nesse cargo a pessoa já foi habilitada
                antes (R3, Grupo A/B), não faz sentido perguntar de novo. */}
            {alocacao.status === 'ACEITO' && !vaga.cargo.ehCoordenacao && (
              <AlocacaoAvaliacaoPopover montagemId={montagemId} alocacao={alocacao} />
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemover(alocacao.id)} aria-label="Remover alocação">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

// Um cargo (VagaMontagem) com quem já está alocado + ação de adicionar — usado tanto na
// Drawer da equipe quanto na Lista completa, pra ter os mesmos poderes nos dois lugares.
// Quando o cargo pede casais E jovens (ex.: Componentes dos Círculos), a lista é separada
// em dois blocos por uma divisória, cada um com sua própria contagem de "faltam X".
export function VagaAlocacoes({
  montagemId,
  vaga,
  alocacoes,
  todasVagas,
  todasAlocacoes,
  encontroAnterior,
  readOnly = false,
}: {
  montagemId: string;
  vaga: VagaMontagem;
  alocacoes: Alocacao[];
  todasVagas: VagaMontagem[];
  todasAlocacoes: Alocacao[];
  encontroAnterior: number;
  readOnly?: boolean;
}) {
  const deleteAlocacao = useDeleteAlocacao(montagemId);

  const ativas = alocacoes.filter((a) => !STATUS_INATIVO.includes(a.status));
  const idsJaAlocados = new Set(ativas.map((a) => a.fichaId ?? a.fichaCasalId ?? ''));

  const precisaJovem = vaga.quantidadeRapazes > 0 || vaga.quantidadeMocas > 0;
  const precisaCasal = vaga.quantidadeCasais > 0;
  const misto = precisaJovem && precisaCasal;

  const casais = { ativas: [] as Alocacao[], total: vaga.quantidadeCasais };
  const jovens = { ativas: [] as Alocacao[], total: vaga.quantidadeRapazes + vaga.quantidadeMocas };
  for (const a of alocacoes) {
    (a.tipoPessoa === 'CASAL' ? casais : jovens).ativas.push(a);
  }
  const casaisPreenchidas = casais.ativas.filter((a) => !STATUS_INATIVO.includes(a.status)).length;
  const jovensPreenchidas = jovens.ativas.filter((a) => !STATUS_INATIVO.includes(a.status)).length;
  const faltamCasais = Math.max(0, casais.total - casaisPreenchidas);
  const faltamJovens = Math.max(0, jovens.total - jovensPreenchidas);

  async function remover(id: string) {
    try {
      await deleteAlocacao.mutateAsync(id);
      toast.success('Alocação removida.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover.');
    }
  }

  function contagem(preenchidas: number, total: number, falta: number, detalhe?: string) {
    return (
      <span className="text-xs text-muted-foreground">
        {preenchidas}/{total}
        {falta > 0 ? ` · faltam ${falta}` : ' · completo'}
        {detalhe && ` (${detalhe})`}
      </span>
    );
  }

  const blocoJovens = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {misto && <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jovens</h4>}
        {contagem(
          jovensPreenchidas,
          jovens.total,
          faltamJovens,
          vaga.quantidadeRapazes > 0 && vaga.quantidadeMocas > 0
            ? `${plural(vaga.quantidadeRapazes, 'rapaz', 'rapazes')} · ${plural(vaga.quantidadeMocas, 'moça', 'moças')}`
            : undefined,
        )}
      </div>
      {jovens.ativas.length > 0 && (
        <ul className="space-y-1">
          {jovens.ativas.map((a) => (
            <LinhaAlocacao
              key={a.id}
              montagemId={montagemId}
              vaga={vaga}
              alocacao={a}
              encontroAnterior={encontroAnterior}
              readOnly={readOnly}
              onRemover={remover}
            />
          ))}
        </ul>
      )}
      {faltamJovens > 0 && !readOnly && (
        <AlocarPessoaCombobox
          montagemId={montagemId}
          vagaMontagemId={vaga.id}
          equipeId={vaga.equipeId}
          ehCoordenacao={vaga.cargo.ehCoordenacao}
          tipoPessoa="JOVEM"
          label="Adicionar jovem"
          idsJaAlocados={idsJaAlocados}
          todasVagas={todasVagas}
          todasAlocacoes={todasAlocacoes}
        />
      )}
    </div>
  );

  const blocoCasais = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {misto && <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Casais</h4>}
        {contagem(casaisPreenchidas, casais.total, faltamCasais)}
      </div>
      {casais.ativas.length > 0 && (
        <ul className="space-y-1">
          {casais.ativas.map((a) => (
            <LinhaAlocacao
              key={a.id}
              montagemId={montagemId}
              vaga={vaga}
              alocacao={a}
              encontroAnterior={encontroAnterior}
              readOnly={readOnly}
              onRemover={remover}
            />
          ))}
        </ul>
      )}
      {faltamCasais > 0 && !readOnly && (
        <AlocarPessoaCombobox
          montagemId={montagemId}
          vagaMontagemId={vaga.id}
          equipeId={vaga.equipeId}
          // R3 pra coordenação de casal só vale nas equipes marcadas (hoje só a Visitação) —
          // nas demais qualquer casal ativo pode coordenar.
          ehCoordenacao={vaga.cargo.ehCoordenacao && vaga.equipe.coordenacaoCasalExigeHistorico}
          tipoPessoa="CASAL"
          label="Adicionar casal"
          idsJaAlocados={idsJaAlocados}
          todasVagas={todasVagas}
          todasAlocacoes={todasAlocacoes}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{vaga.cargo.nome}</h3>

      {misto ? (
        <div className="space-y-3">
          {blocoJovens}
          <Separator />
          {blocoCasais}
        </div>
      ) : precisaCasal ? (
        blocoCasais
      ) : (
        blocoJovens
      )}
    </div>
  );
}
