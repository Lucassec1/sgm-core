import { cookies } from 'next/headers';
import type { SessaoAtual } from './api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Server Components não repassam cookies do browser automaticamente pro `fetch` — precisa
// montar o header manualmente. Usado pelos layouts que exigem sessão ((app), (conselho)).
export async function obterSessaoServidor(): Promise<SessaoAtual | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sgm_token');
  if (!token) return null;

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Cookie: `sgm_token=${token.value}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}
