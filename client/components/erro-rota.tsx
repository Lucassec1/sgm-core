'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

// Conteúdo dos error.tsx de (app) e (conselho) — o erro fica restrito à página, mantendo
// header/sidebar de pé (antes caía no global-error.tsx e a tela inteira sumia). `reset`
// re-renderiza só o segmento, sem perder a sessão nem recarregar o app.
export function ErroRota({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Algo deu errado nesta tela</h1>
        <p className="text-sm text-muted-foreground">
          Tente de novo. Se continuar, recarregue a página ou avise a equipe técnica.
        </p>
      </div>
      <Button onClick={reset}>Tentar de novo</Button>
    </div>
  );
}
