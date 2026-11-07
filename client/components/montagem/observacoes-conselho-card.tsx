'use client';

import { MessageSquareText } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useObservacoesConselho } from '@/lib/hooks/use-montagens';
import type { ObservacaoConselho } from '@/lib/types';

// R8 — o Conselho escreve observações na montagem (área do Conselho); aqui a paróquia só lê.
// Antes o retorno dependia de alguém avisar no grupo, fora do sistema. Sem observações, o card
// não aparece. Fica acima das abas, então é compacto: só a mais recente à vista, as anteriores
// recolhidas — não empurra o quadro pra baixo a cada observação nova.
export function ObservacoesConselhoCard({ montagemId }: { montagemId: string }) {
  const { data: observacoes } = useObservacoesConselho(montagemId);

  if (!observacoes?.length) return null;
  const [maisRecente, ...anteriores] = observacoes;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <MessageSquareText className="h-4 w-4 shrink-0" aria-hidden />
            Observações do Conselho
          </h2>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {observacoes.length === 1 ? '1 observação' : `${observacoes.length} observações`}
          </span>
        </div>
        <Observacao observacao={maisRecente} />
        {anteriores.length > 0 && (
          <details className="group border-t pt-3 text-sm">
            <summary className="cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground">
              Ver {anteriores.length === 1 ? 'a anterior' : `as ${anteriores.length} anteriores`}
            </summary>
            <div className="mt-4 space-y-4">
              {anteriores.map((observacao) => (
                <Observacao key={observacao.id} observacao={observacao} />
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function Observacao({ observacao }: { observacao: ObservacaoConselho }) {
  return (
    <div className="space-y-1.5 border-l-2 pl-3 text-sm">
      <p className="whitespace-pre-wrap leading-relaxed">{observacao.texto}</p>
      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        <span className="font-bold">{observacao.usuario.nome ?? 'Conselho'}</span>
        <time dateTime={observacao.createdAt}>
          {new Date(observacao.createdAt).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </time>
      </p>
    </div>
  );
}
