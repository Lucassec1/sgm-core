'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { AtuacaoEncerradaListener, SessaoExpiradaListener } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { criarQueryClient } from '@/lib/query-client';

// Toaster fica aqui (raiz), não dentro de (app)/(conselho) — /login e as telas de senha vivem fora
// dos dois grupos, e sem o Toaster montado ali os toast.error()/toast.success() não aparecem
// (renderizam num portal que só existe se o componente estiver montado em algum lugar).
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(criarQueryClient);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ServiceWorkerRegistration />
        <SessaoExpiradaListener />
        <AtuacaoEncerradaListener />
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
