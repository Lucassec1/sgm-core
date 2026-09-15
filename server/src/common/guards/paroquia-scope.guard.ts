import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RoleUsuario } from '@prisma/client';
import { UsuarioAutenticado } from '../types/usuario-autenticado';

// Ponto único de garantia do isolamento entre paróquias (R7, docs/arquitetura.md seção 3).
// Aplicado nos controllers de Fichas/FichasCasais/Montagem (e módulos dependentes): bloqueia
// contas PAROQUIA sem paroquiaId (não deveria existir, mas não confia em silêncio) e deixa o
// Conselho passar — o Conselho não tem paroquiaId fixo, e a autorização fina dele (o que pode
// e não pode ler) é feita nos controllers próprios do módulo Conselho, não aqui.
@Injectable()
export class ParoquiaScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: UsuarioAutenticado }>();
    const usuario = request.user;

    if (usuario?.role === RoleUsuario.CONSELHO) {
      return true;
    }

    if (usuario?.role === RoleUsuario.PAROQUIA && usuario.paroquiaId) {
      return true;
    }

    throw new ForbiddenException('Conta sem paróquia associada');
  }
}
