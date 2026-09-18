import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsuarioAutenticado } from '../types/usuario-autenticado';
import { COOKIE_MAX_AGE_MS, COOKIE_NAME, cookieOptions } from '../auth/cookie';

// Guard global (ver app.module.ts, APP_GUARD) — toda rota exige JWT válido (cookie httpOnly),
// exceto as marcadas @Public() (login/logout, endpoints do Telão).
//
// Sessão "desliza" enquanto em uso: toda requisição autenticada com sucesso reemite o cookie
// com a expiração renovada (COOKIE_MAX_AGE_MS a partir de agora, não do login original). Só
// desloga quem realmente ficou o período inteiro sem fazer nenhuma requisição — usar o
// sistema ativamente mantém a sessão viva.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const autenticado = (await super.canActivate(context)) as boolean;
    if (!autenticado) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{ user: UsuarioAutenticado }>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = await this.jwtService.signAsync({
      sub: request.user.id,
      role: request.user.role,
      paroquiaId: request.user.paroquiaId,
    });
    response.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });

    return true;
  }
}
