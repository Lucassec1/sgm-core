import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

// TODO: injeta automaticamente o paroquia_id do usuário autenticado em toda query relevante.
// Ponto único de garantia do isolamento entre paróquias (regra R7) — ver docs/arquitetura.md, seção 3,
// e docs/regras-imutaveis.md, R7.
@Injectable()
export class ParoquiaScopeGuard implements CanActivate {
  canActivate(
    _context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
