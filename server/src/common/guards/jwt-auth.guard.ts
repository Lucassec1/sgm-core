import { ConflictException, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsuarioAutenticado } from '../types/usuario-autenticado';
import { COOKIE_MAX_AGE_MS, COOKIE_NAME, cookieOptions } from '../auth/cookie';

// Guard global (ver app.module.ts, APP_GUARD) — toda rota exige JWT válido (cookie httpOnly),
// exceto as marcadas @Public() (login/logout, esqueci/redefinir senha, health).
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

    const request = context.switchToHttp().getRequest<{ user: UsuarioAutenticado; url?: string }>();
    const response = context.switchToHttp().getResponse<Response>();
    const { user } = request;
    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      // Atuando como afilhada, o token guarda a paróquia da conta (a madrinha) e o vínculo — a
      // JwtStrategy reconfere a atuação na próxima requisição.
      paroquiaId: user.paroquiaOrigemId ?? user.paroquiaId,
      ...(user.implantacaoId && { implantacaoId: user.implantacaoId }),
      emitidoEm: Date.now(),
    });
    response.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });

    // A fase da implantação mudou com a madrinha atuando: o cookie acima já volta pra madrinha,
    // mas a ação em curso era pra afilhada — não executa (gravaria na paróquia errada). As rotas
    // de auth seguem, pro client buscar a sessão nova e se reorganizar.
    if (user.atuacaoEncerrada && !request.url?.startsWith('/auth/')) {
      throw new ConflictException({
        code: 'ATUACAO_ENCERRADA',
        message: 'A implantação mudou de fase: você voltou para a sua paróquia.',
      });
    }

    return true;
  }
}
