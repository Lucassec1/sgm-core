import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsuarioAutenticado } from '../../../common/types/usuario-autenticado';

interface JwtPayload {
  sub: string;
  role: UsuarioAutenticado['role'];
  paroquiaId: string | null;
  iat?: number;
}

// Lê o token do cookie httpOnly (sgm_token), não do header Authorization — decisão de produto:
// client guarda a sessão em cookie, não localStorage (ver docs/producao.md).
function extractFromCookie(req: Request): string | null {
  return req?.cookies?.sgm_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Confere o usuário no banco a cada requisição: como o guard renova o cookie sempre que a
  // sessão é usada, um token válido sozinho nunca expiraria — sem isso, conta desativada ou
  // senha resetada pelo Conselho não derrubaria quem já estava logado.
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, paroquiaId: true, ativo: true, senhaAlteradaEm: true },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException();
    }
    // `iat` tem precisão de segundo; um token emitido no mesmo segundo da troca ainda vale.
    if (
      usuario.senhaAlteradaEm &&
      (payload.iat ?? 0) < Math.floor(usuario.senhaAlteradaEm.getTime() / 1000)
    ) {
      throw new UnauthorizedException();
    }
    return { id: usuario.id, role: usuario.role, paroquiaId: usuario.paroquiaId };
  }
}
