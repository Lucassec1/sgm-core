import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { verificarOrigem } from './origem.middleware';

const CLIENT = 'https://sgm.vercel.app';

function rodar(origens: string[], method: string, origin?: string) {
  const next = jest.fn();
  const req = { method, headers: origin ? { origin } : {} } as unknown as Request;
  verificarOrigem(origens)(req, {} as Response, next);
  return next;
}

describe('verificarOrigem (CSRF)', () => {
  it('bloqueia POST de outra origem', () => {
    const next = rodar([CLIENT], 'POST', 'https://site-malicioso.com');
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenException));
  });

  it('libera POST/PATCH/DELETE vindos do client', () => {
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      expect(rodar([CLIENT], method, CLIENT)).toHaveBeenCalledWith();
    }
  });

  it('libera leituras de qualquer origem (o CORS cuida de quem lê a resposta)', () => {
    expect(rodar([CLIENT], 'GET', 'https://site-malicioso.com')).toHaveBeenCalledWith();
  });

  it('libera requisição sem Origin (fora de navegador)', () => {
    expect(rodar([CLIENT], 'POST')).toHaveBeenCalledWith();
  });

  it('não checa nada sem allow-list (dev local)', () => {
    expect(rodar([], 'POST', 'http://qualquer.coisa')).toHaveBeenCalledWith();
  });
});
