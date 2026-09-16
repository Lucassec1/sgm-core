// Rastreamento de erro (docs/producao.md, seção "Importantes") — inativo até alguém colar um
// DSN de verdade em NEXT_PUBLIC_SENTRY_DSN (.env). Runtimes server/edge — ver
// instrumentation-client.ts pro runtime client.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }
}

export async function onRequestError(
  ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
}
