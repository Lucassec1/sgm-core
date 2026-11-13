import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { FaseImplantacao, RoleUsuario } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsuarioAutenticado } from '../../../common/types/usuario-autenticado';

interface JwtPayload {
  sub: string;
  role: UsuarioAutenticado['role'];
  paroquiaId: string | null;
  iat?: number;
  // Momento da emissão em ms (o `iat` padrão é em segundos) — ver validate().
  emitidoEm?: number;
  // Madrinha atuando como afilhada (implantação) — ver validate().
  implantacaoId?: string;
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
    // Compara em ms: com o `iat` (segundos), uma sessão iniciada no mesmo segundo da troca ou
    // do reset sobrevivia a ele. Token antigo, sem `emitidoEm`, conta como emitido no início do
    // segundo do `iat` (lado seguro).
    const emitidoEm = payload.emitidoEm ?? (payload.iat ?? 0) * 1000;
    if (usuario.senhaAlteradaEm && emitidoEm < usuario.senhaAlteradaEm.getTime()) {
      throw new UnauthorizedException();
    }
    const sessao = { id: usuario.id, role: usuario.role, paroquiaId: usuario.paroquiaId };

    // Atuação como afilhada: vale só enquanto o vínculo está em IMPLANTACAO e a paróquia da conta
    // é a madrinha. Conferido a cada requisição — quando o Conselho muda a fase, a sessão volta
    // pra madrinha marcada como `atuacaoEncerrada`; o guard reemite o cookie sem a atuação e
    // recusa a ação em curso (ver JwtAuthGuard).
    if (payload.implantacaoId && usuario.role === RoleUsuario.PAROQUIA && usuario.paroquiaId) {
      const vinculo = await this.prisma.implantacao.findFirst({
        where: {
          id: payload.implantacaoId,
          madrinhaId: usuario.paroquiaId,
          fase: FaseImplantacao.IMPLANTACAO,
        },
        select: { afilhadaId: true },
      });
      if (vinculo) {
        return {
          ...sessao,
          paroquiaId: vinculo.afilhadaId,
          paroquiaOrigemId: usuario.paroquiaId,
          implantacaoId: payload.implantacaoId,
        };
      }
    }
    return payload.implantacaoId && usuario.role === RoleUsuario.PAROQUIA
      ? { ...sessao, atuacaoEncerrada: true }
      : sessao;
  }
}
