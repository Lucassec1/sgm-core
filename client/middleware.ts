import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Primeira camada de proteção de rota (docs/producao.md, bloqueador #3) — só checa a
// PRESENÇA do cookie de sessão (não dá pra validar o JWT aqui sem o segredo, o Edge Runtime
// não roda o mesmo código do Nest). A checagem de verdade (sessão válida + role certo pro
// grupo de rota) acontece nos layouts de servidor ((app)/layout.tsx e (conselho)/layout.tsx),
// que chamam GET /auth/me de fato. Isso aqui só evita o flash de UI protegida sem cookie nenhum.
export function middleware(request: NextRequest) {
  const temSessao = request.cookies.has('sgm_token');
  if (!temSessao) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Exclui: /login (senão ninguém consegue nem chegar no form), assets do Next, e o modo
  // Telão (rota pública de propósito — ver docs/propostas.md, proposta #5).
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|montagem/.*/telao).*)'],
};
