import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { UsuarioAutenticado } from '../types/usuario-autenticado';

// Lê o paroquiaId do usuário autenticado (populado pela JwtStrategy). Só faz sentido em rotas
// de conta PAROQUIA — se chamado numa rota acessível ao Conselho (paroquiaId null), é bug de
// uso do decorator, não erro do usuário final, por isso lança 403 em vez de deixar undefined
// vazar silenciosamente pra uma query do Prisma.
export const ParoquiaAtual = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: UsuarioAutenticado }>();
  const paroquiaId = request.user?.paroquiaId;
  if (!paroquiaId) {
    throw new ForbiddenException('Rota exclusiva de conta de paróquia');
  }
  return paroquiaId;
});
