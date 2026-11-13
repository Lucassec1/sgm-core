'use client';

import { ArrowLeftRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAtuar, useSessao } from '@/lib/auth-context';

// Faixa fixa enquanto a madrinha atua pela afilhada (implantação): tudo que se faz aqui vale pra
// afilhada, então isso fica sempre à vista.
export function AtuandoBanner() {
  const { data: sessao } = useSessao();
  const atuar = useAtuar();

  if (!sessao?.atuando) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b bg-ouro-suave px-4 py-2 text-sm text-ouro-foreground"
    >
      <p className="flex items-center gap-2 font-bold">
        <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
        Atuando como {sessao.atuando.afilhada.nome}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => atuar.mutate(null)}
        disabled={atuar.isPending}
      >
        Voltar para a minha paróquia
      </Button>
    </div>
  );
}
