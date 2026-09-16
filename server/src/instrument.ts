import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Rastreamento de erro (docs/producao.md, seção "Importantes") — inativo até alguém colar um
// DSN de verdade em SENTRY_DSN (.env). Sem essa env, Sentry.init nunca é chamado: nenhum dado
// sai do servidor. Precisa ser importado ANTES de qualquer outro módulo em main.ts — é assim
// que o SDK consegue instrumentar automaticamente o resto da aplicação.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  });
}
