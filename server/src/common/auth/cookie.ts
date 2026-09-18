// Config do cookie de sessão — compartilhada entre AuthController (login/logout) e
// JwtAuthGuard (renovação a cada requisição autenticada, ver jwt-auth.guard.ts).
export const COOKIE_NAME = 'sgm_token';

// 12h — mantido em sincronia manualmente com JWT_EXPIRES_IN (.env). Como o guard global
// renova o cookie a cada requisição autenticada (sessão "desliza" enquanto em uso), esse
// valor é o tempo de INATIVIDADE até deslogar, não um limite fixo a partir do login.
export const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// Produção: client (Vercel) e server (Render) vivem em domínios diferentes — cookie
// cross-site só é enviado pelo navegador em requisições fetch/XHR com SameSite=None
// (exige Secure, ok porque os dois são HTTPS). Em dev local, Lax + sem Secure (http puro).
export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
}
