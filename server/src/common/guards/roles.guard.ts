import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RoleUsuario } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsuarioAutenticado } from '../types/usuario-autenticado';

// Restringe rotas a roles específicas (hoje só usado por @Roles('CONSELHO') no módulo Conselho
// e na gestão de credenciais de paróquia). Roda depois do JwtAuthGuard global.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidas = this.reflector.getAllAndOverride<RoleUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesPermitidas || rolesPermitidas.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: UsuarioAutenticado }>();
    const role = request.user?.role;
    if (!role || !rolesPermitidas.includes(role)) {
      throw new ForbiddenException('Sem permissão pra acessar este recurso');
    }
    return true;
  }
}
