'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { SessaoExpiradaListener } from '@/lib/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ServiceWorkerRegistration />
        <SessaoExpiradaListener />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
