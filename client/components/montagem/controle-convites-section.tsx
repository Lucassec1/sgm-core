'use client';

import { useState } from 'react';

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
import { AvisoBadges } from './aviso-badges';
import { PessoaPreviewPopover } from './pessoa-preview-popover';
import type { Alocacao, StatusConvite } from '@/lib/types';
import { nomeAlocacao, ordenarPorEquipe } from '@/lib/montagem';

const STATUS_ATIVO = ['RASCUNHO', 'CONVIDADO', 'ACEITO'];
const FILTROS: { valor: StatusConvite | 'TODOS'; label: string }[] = [
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'RASCUNHO', label: 'Rascunho' },
  { valor: 'CONVIDADO', label: 'Convidado' },
  { valor: 'ACEITO', label: 'Aceito' },
  { valor: 'RECUSADO', label: 'Recusou' },
  { valor: 'DESISTIU', label: 'Desistiu' },
];

// Aba Convites — visão consolidada de todos os convites da montagem por status
// (docs/requisitos.md 2.2). As saídas (recusas/desistências com motivo) moram na aba
// Substituições, junto da lista de substituição e de quem não está na montagem.
export function ControleConvitesSection({ alocacoes }: { alocacoes: Alocacao[] }) {
  const [filtro, setFiltro] = useState<StatusConvite | 'TODOS'>('TODOS');

  const ativas = [...alocacoes]
    .filter((a) => STATUS_ATIVO.includes(a.status))
    .sort(ordenarPorEquipe);
  const visiveis =
    filtro === 'TODOS'
      ? [...alocacoes].sort(ordenarPorEquipe)
      : [...alocacoes].filter((a) => a.status === filtro).sort(ordenarPorEquipe);

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
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <PessoaPreviewPopover ficha={a.ficha} fichaCasal={a.fichaCasal}>
                        {nomeAlocacao(a)}
                      </PessoaPreviewPopover>
                      <AvisoBadges avisos={a.avisos} />
                    </div>
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
    </div>
  );
}
