'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { AlocacaoStatusBadge } from './alocacao-status-badge';
import { AlocarPessoaCombobox } from './alocar-pessoa-combobox';
import { PessoaPreviewPopover } from './pessoa-preview-popover';
import type { Alocacao, StatusConvite, VagaMontagem } from '@/lib/types';

const STATUS_ATIVO = ['RASCUNHO', 'CONVIDADO', 'ACEITO'];
const FILTROS: { valor: StatusConvite | 'TODOS'; label: string }[] = [
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'RASCUNHO', label: 'Rascunho' },
  { valor: 'CONVIDADO', label: 'Convidado' },
  { valor: 'ACEITO', label: 'Aceito' },
  { valor: 'RECUSADO', label: 'Recusou' },
  { valor: 'DESISTIU', label: 'Desistiu' },
];

function nomeAlocacao(a: Alocacao) {
  return (
    a.ficha?.nomeCompleto ??
    (a.fichaCasal ? `${a.fichaCasal.nomeEle} e ${a.fichaCasal.nomeEla}` : '—')
  );
}

function ordenar(a: Alocacao, b: Alocacao) {
  const ea = a.vagaMontagem.equipe.ordem - b.vagaMontagem.equipe.ordem;
  if (ea !== 0) return ea;
  return a.vagaMontagem.cargo.ordem - b.vagaMontagem.cargo.ordem;
}

// Aba Convites — visão consolidada de todos os convites da montagem por status
// (docs/requisitos.md 2.2) + o registro de saídas (recusas/desistências com motivo,
// R1/R9), visível enquanto o encontro não é finalizado.
export function ControleConvitesSection({
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
  const [filtro, setFiltro] = useState<StatusConvite | 'TODOS'>('TODOS');
  const [substituindoVagaId, setSubstituindoVagaId] = useState<string | null>(null);

  const ativas = [...alocacoes].filter((a) => STATUS_ATIVO.includes(a.status)).sort(ordenar);
  const saidas = [...alocacoes]
    .filter((a) => a.status === 'RECUSADO' || a.status === 'DESISTIU')
    .sort(ordenar);
  const visiveis =
    filtro === 'TODOS'
      ? [...alocacoes].sort(ordenar)
      : [...alocacoes].filter((a) => a.status === filtro).sort(ordenar);

  const idsAtivosNaVaga = (vagaId: string) =>
    new Set(
      alocacoes
        .filter((a) => a.vagaMontagemId === vagaId && STATUS_ATIVO.includes(a.status))
        .map((a) => a.fichaId ?? a.fichaCasalId ?? ''),
    );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Convites</h3>
          <span className="text-xs text-muted-foreground">
            {ativas.filter((a) => a.status === 'ACEITO').length} aceitos ·{' '}
            {ativas.filter((a) => a.status === 'CONVIDADO').length} aguardando resposta
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                filtro === f.valor
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Equipe / cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Motivo da saída</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    Nenhum convite nesse status.
                  </TableCell>
                </TableRow>
              )}
              {visiveis.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <PessoaPreviewPopover ficha={a.ficha} fichaCasal={a.fichaCasal}>
                      {nomeAlocacao(a)}
                    </PessoaPreviewPopover>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm">
                      <EquipeIcon
                        slug={a.vagaMontagem.equipe.slug}
                        nome={a.vagaMontagem.equipe.nome}
                        size={16}
                      />
                      {a.vagaMontagem.equipe.nome}
                      <span className="text-muted-foreground">· {a.vagaMontagem.cargo.nome}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <AlocacaoStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.motivoRecusa || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Saídas registradas neste encontro
        </h3>
        {saidas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém recusou ou desistiu ainda.</p>
        ) : (
          <ul className="space-y-2">
            {saidas.map((a) => {
              const vaga = todasVagas.find((v) => v.id === a.vagaMontagemId);
              return (
                <li key={a.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-transparent bg-red-50 font-medium text-red-700 dark:bg-red-950 dark:text-red-400"
                    >
                      {a.status === 'DESISTIU' ? 'Desistiu' : 'Recusou'}
                    </Badge>
                    <span className="font-medium">{nomeAlocacao(a)}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <EquipeIcon
                        slug={a.vagaMontagem.equipe.slug}
                        nome={a.vagaMontagem.equipe.nome}
                        size={16}
                      />
                      {a.vagaMontagem.equipe.nome} · {a.vagaMontagem.cargo.nome}
                    </span>
                    {!readOnly && vaga && (
                      <button
                        onClick={() =>
                          setSubstituindoVagaId(
                            substituindoVagaId === a.vagaMontagemId ? null : a.vagaMontagemId,
                          )
                        }
                        className="ml-auto text-xs text-foreground underline underline-offset-2"
                      >
                        {substituindoVagaId === a.vagaMontagemId ? 'Fechar' : 'Substituir'}
                      </button>
                    )}
                  </div>
                  {a.motivoRecusa && (
                    <p className="mt-1 text-muted-foreground">Motivo: {a.motivoRecusa}</p>
                  )}
                  {!readOnly && vaga && substituindoVagaId === a.vagaMontagemId && (
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
        <p className="text-xs text-muted-foreground">
          Some quando a montagem é finalizada — ser substituto num encontro não influencia o próximo
          (R9).
        </p>
      </section>
    </div>
  );
}
