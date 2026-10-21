import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Fixa a raiz do workspace explicitamente — sem isso o Next se confunde com o
  // package-lock.json da raiz do monorepo (Prettier/Husky) e infere o diretório errado.
  outputFileTracingRoot: __dirname,
  // Next 16 reescreve o CLAUDE.md a cada `next dev` com um bloco de regras genéricas pra agentes —
  // aqui as convenções são mantidas à mão, então desliga.
  agentRules: false,
  // Headers de segurança básicos em todas as páginas. Sem CSP completa por enquanto (o Next e o
  // next-themes injetam script inline, exigiria nonce) — só frame-ancestors, contra clickjacking.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

// withSentryConfig é um no-op seguro sem NEXT_PUBLIC_SENTRY_DSN configurado (não faz upload de
// sourcemap nem exige SENTRY_AUTH_TOKEN nesse caso) — ver instrumentation.ts/instrumentation-client.ts pra ativação.
export default withSentryConfig(nextConfig, {
  silent: true,
});
