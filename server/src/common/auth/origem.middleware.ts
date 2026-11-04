import { ForbiddenException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Proteção contra CSRF. Em produção o cookie de sessão é SameSite=None (client e server em
// domínios diferentes, ver cookie.ts), então o navegador o anexa até num <form> enviado por
// outro site — e o CORS não impede o envio, só a leitura da resposta. Todo navegador manda
// `Origin` em requisição cross-site que altera estado, então basta exigir que ela seja uma das
// origens do CORS_ORIGINS. Requisição sem Origin (curl, health check) não carrega cookie de
// navegador de terceiro e passa. Sem allow-list (dev local), não checa nada.
export function verificarOrigem(origensPermitidas: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const origem = req.headers.origin;
    if (
      origensPermitidas.length === 0 ||
      METODOS_SEGUROS.has(req.method) ||
      !origem ||
      origensPermitidas.includes(origem)
    ) {
      return next();
    }
    next(new ForbiddenException('Origem não permitida'));
  };
}
