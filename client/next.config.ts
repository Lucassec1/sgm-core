import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Fixa a raiz do workspace explicitamente — sem isso o Next se confunde com o
  // package-lock.json da raiz do monorepo (Prettier/Husky) e infere o diretório errado.
  outputFileTracingRoot: __dirname,
};

// withSentryConfig é um no-op seguro sem NEXT_PUBLIC_SENTRY_DSN configurado (não faz upload de
// sourcemap nem exige SENTRY_AUTH_TOKEN nesse caso) — ver instrumentation.ts/instrumentation-client.ts pra ativação.
export default withSentryConfig(nextConfig, {
  silent: true,
});
