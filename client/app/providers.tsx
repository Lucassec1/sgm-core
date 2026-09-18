'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { SessaoExpiradaListener } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';

// Toaster fica aqui (raiz), não dentro de (app)/(conselho) — /login e o modo Telão vivem fora
// dos dois grupos, e sem o Toaster montado ali os toast.error()/toast.success() não aparecem
// (renderizam num portal que só existe se o componente estiver montado em algum lugar).
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ServiceWorkerRegistration />
        <SessaoExpiradaListener />
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
