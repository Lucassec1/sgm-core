'use client';

import { useState } from 'react';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { QuadrantesSection } from '@/components/montagem/quadrantes-section';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMontagens } from '@/lib/hooks/use-montagens';

// Quadrantes em página própria (fora da montagem): os PDFs são consultados, impressos e
// mandados no grupo sem precisar abrir o quadro. Cada encontro tem os seus — abre no encontro
// em andamento (ou no mais recente) e o seletor leva aos anteriores.
export default function QuadrantesPage() {
  const { data, isLoading, isError } = useMontagens({ pageSize: 50 });
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);

  const montagens = data?.items ?? [];
  const padrao = montagens.find((m) => m.status === 'EM_ANDAMENTO') ?? montagens[0];
  const montagem = montagens.find((m) => m.id === escolhidaId) ?? padrao;

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <PageHeader
        title="Quadrantes"
        actions={
          montagens.length > 1 && montagem ? (
            <Select value={montagem.id} onValueChange={setEscolhidaId}>
              <SelectTrigger className="w-56" aria-label="Encontro">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {montagens.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.numeroEncontro}º Encontro
                    {m.status === 'EM_ANDAMENTO' ? ' (em andamento)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar os encontros. Confira a conexão e recarregue a página.
        </p>
      )}
      {data && !montagem && (
        <p className="text-sm text-muted-foreground">
          Nenhum encontro cadastrado. Os quadrantes ficam guardados por encontro: crie a montagem em{' '}
          <Link href="/montagem" className="font-bold underline underline-offset-2">
            Montagem
          </Link>{' '}
          e volte aqui para enviar os PDFs.
        </p>
      )}

      {montagem && (
        <section className="space-y-3">
          <h2 className="text-base font-bold">
            {montagem.numeroEncontro}º Encontro
            {montagem.status === 'FINALIZADA' && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">finalizado</span>
            )}
          </h2>
          <QuadrantesSection montagemId={montagem.id} readOnly={montagem.status === 'FINALIZADA'} />
        </section>
      )}
    </div>
  );
}
