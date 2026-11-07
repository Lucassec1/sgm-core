import type { AvisoRegra } from '../types';
import { markServedFresh, markServedFromCache } from '../offline-status';

// Base comum de todas as chamadas à API (fetch + tratamento de erro/sessão/offline) — os
// módulos de domínio ao lado (auth, fichas, montagens...) só montam caminho e corpo.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// 409 de repetição de equipe (R2) chega com um body estruturado (code, vezesServidas,
// equipeNome) — o front precisa distinguir isso de um erro genérico pra oferecer o
// Alert Dialog de confirmação em vez de só mostrar a mensagem.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Avisos de R1–R4 de um 409 AVISOS_REGRAS (null se o erro for outro). O formato antigo, só R2
// (REPETICAO_EQUIPE), ainda é entendido pra não quebrar durante o deploy do server.
export function avisosDoErro(err: unknown): AvisoRegra[] | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const body = err.body as { code?: string; avisos?: AvisoRegra[]; message?: string } | null;
  if (body?.code === 'AVISOS_REGRAS' && body.avisos?.length) return body.avisos;
  if (body?.code === 'REPETICAO_EQUIPE') {
    const mensagem = body.message ?? err.message;
    return [{ regra: 'R2', nivel: 'atencao', rotulo: 'Já serviu nesta equipe', mensagem }];
  }
  return null;
}

// Dispara em qualquer 401 (sessão expirada/ausente) pra quem estiver ouvindo (ver
// client/lib/auth-context.tsx) redirecionar pro /login. Fica fora do React de propósito —
// `request()` é usado por código que não é componente (ex. Server Components/actions).
function markSessaoExpirada() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sgm:sessao-expirada'));
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });

  // Sinal de "sem conexão" (proposta #6) — só as leituras da Montagem passam pelo Service
  // Worker (public/sw.js), então esse header só aparece nelas; qualquer outra resposta
  // bem-sucedida confirma que a rede está OK e limpa o aviso.
  if (res.headers.get('x-from-cache')) markServedFromCache();
  else markServedFresh();

  if (!res.ok) {
    if (res.status === 401) markSessaoExpirada();
    const body = await res.json().catch(() => null);
    const message = (body?.message as string) ?? `Erro ${res.status} ao chamar ${path}`;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function buildQuery(params: object) {
  const query = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}
