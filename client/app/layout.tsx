import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SGM Core',
  description: 'Gestão de Fichas e Montagem — Segue-me, diocese de Crato',
  icons: {
    icon: '/logo-segue-me.png',
  },
};

// Figtree — geométrica e legível, de formas abertas (sem o "q" com gancho que destoava na
// Atkinson). Uma família só; a hierarquia vem do peso e do tamanho (ver docs/design-system.md).
const fonte = Figtree({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

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
    <html lang="pt-BR" className={fonte.variable} suppressHydrationWarning>
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:ring-2 focus:ring-ring"
        >
          Pular para o conteúdo
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
