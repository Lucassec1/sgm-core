'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Error boundary raiz do App Router — reporta pro Sentry (inativo sem NEXT_PUBLIC_SENTRY_DSN,
// ver instrumentation-client.ts) e mostra uma tela mínima de erro. Só entra em jogo quando um
// erro escapa de todos os error.tsx específicos de rota (nenhum existe ainda).
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <div>
            <h1 className="text-lg font-semibold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Recarregue a página. Se persistir, avise a equipe técnica.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
