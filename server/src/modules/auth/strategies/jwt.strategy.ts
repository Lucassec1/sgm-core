import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UsuarioAutenticado } from '../../../common/types/usuario-autenticado';

interface JwtPayload {
  sub: string;
  role: UsuarioAutenticado['role'];
  paroquiaId: string | null;
}

// Lê o token do cookie httpOnly (sgm_token), não do header Authorization — decisão de produto:
// client guarda a sessão em cookie, não localStorage (ver docs/producao.md).
function extractFromCookie(req: Request): string | null {
  return req?.cookies?.sgm_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): UsuarioAutenticado {
    return { id: payload.sub, role: payload.role, paroquiaId: payload.paroquiaId };
  }
}
