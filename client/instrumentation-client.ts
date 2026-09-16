import * as Sentry from '@sentry/nextjs';

// Rastreamento de erro (docs/producao.md, seção "Importantes") — inativo até alguém colar um
// DSN de verdade em NEXT_PUBLIC_SENTRY_DSN (.env). Sem essa env, Sentry.init nunca é chamado.
// Runtime client — ver instrumentation.ts pros runtimes server/edge.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
