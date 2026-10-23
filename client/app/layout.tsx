import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SGM Core',
  description: 'Gestão de Fichas e Montagem — Segue-me, diocese de Crato',
  icons: {
    icon: '/logo-segue-me.png',
  },
};

// Cor da barra do navegador no celular acompanhando o tema do sistema — mesmos valores de
// --background (claro/escuro) em globals.css.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
