'use client';

import { MessageSquareText } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useObservacoesConselho } from '@/lib/hooks/use-montagens';

// R8 — o Conselho escreve observações na montagem (área do Conselho); aqui a paróquia só lê.
// Antes o retorno dependia de alguém avisar no grupo, fora do sistema. Sem observações, o card
// não aparece — não ocupa espaço numa montagem que o Conselho ainda não comentou.
export function ObservacoesConselhoCard({ montagemId }: { montagemId: string }) {
  const { data: observacoes } = useObservacoesConselho(montagemId);

  if (!observacoes?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="h-4 w-4" />
          Observações do Conselho
        </CardTitle>
        <CardDescription>
          {observacoes.length === 1
            ? '1 observação registrada pelo Conselho nesta montagem.'
            : `${observacoes.length} observações registradas pelo Conselho nesta montagem.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {observacoes.map((observacao) => (
          <div key={observacao.id} className="text-sm">
            <p className="whitespace-pre-wrap">{observacao.texto}</p>
            <p className="text-xs text-muted-foreground">
              {observacao.usuario.nome ?? 'Conselho'} ·{' '}
              {new Date(observacao.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
