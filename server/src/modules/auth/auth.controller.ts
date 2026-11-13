import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { EsqueciSenhaDto } from './dto/esqueci-senha.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import { AtuarDto } from './dto/atuar.dto';
import { Public } from '../../common/decorators/public.decorator';
import { UsuarioAutenticado } from '../../common/types/usuario-autenticado';
import { COOKIE_MAX_AGE_MS, COOKIE_NAME, cookieOptions } from '../../common/auth/cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Limite bem mais apertado que o global (100/min) contra força bruta de senha — 10/min por
  // IP ainda folga pra uma equipe inteira logando da mesma rede da paróquia.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const usuario = await this.authService.validarUsuario(dto.login, dto.senha);
    const token = await this.authService.login(usuario);

    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });

    return this.authService.me(usuario.id);
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: Request & { user: UsuarioAutenticado }) {
    return this.authService.me(req.user.id, req.user.implantacaoId);
  }

  // Implantação: a madrinha passa a operar a afilhada pelas mesmas telas (docs/implantacao.md).
  // O cookie novo carrega o vínculo; a JwtStrategy reconfere a cada requisição.
  @Post('atuar')
  async atuar(
    @Body() dto: AtuarDto,
    @Req() req: Request & { user: UsuarioAutenticado },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.validarAtuacao(req.user, dto.implantacaoId);
    const token = await this.authService.login(this.contaPropria(req.user), dto.implantacaoId);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
    return this.authService.me(req.user.id, dto.implantacaoId);
  }

  @Delete('atuar')
  async pararDeAtuar(
    @Req() req: Request & { user: UsuarioAutenticado },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.authService.login(this.contaPropria(req.user));
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
    return this.authService.me(req.user.id);
  }

  // A sessão "de verdade" da conta, sem a atuação (paróquia de origem = a madrinha).
  private contaPropria(user: UsuarioAutenticado) {
    return { id: user.id, role: user.role, paroquiaId: user.paroquiaOrigemId ?? user.paroquiaId };
  }

  // Self-service — qualquer conta autenticada (PAROQUIA ou CONSELHO) troca a própria senha,
  // sem depender do Conselho pra resetar por fora. Útil pra virada de equipe dirigente todo
  // início de ano, por exemplo.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Patch('senha')
  async alterarSenha(
    @Body() dto: AlterarSenhaDto,
    @Req() req: Request & { user: UsuarioAutenticado },
    @Res({ passthrough: true }) res: Response,
  ) {
    // A senha é da conta da madrinha — não se troca de dentro da afilhada.
    if (req.user.implantacaoId) {
      throw new ForbiddenException('Volte para a sua paróquia para trocar a senha');
    }
    await this.authService.alterarSenha(req.user.id, dto.senhaAtual, dto.senhaNova);
    // A troca invalida toda sessão anterior (senhaAlteradaEm, ver JwtStrategy) — inclusive o
    // cookie que o guard acabou de renovar; reemite um novo pra quem trocou continuar logado.
    const token = await this.authService.login(req.user);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
    return { ok: true };
  }

  // "Primeiro acesso ou esqueceu a senha?" — manda o link de criar/redefinir senha pro e-mail
  // da conta. Resposta sempre igual (ver AuthService.solicitarLink). Limite baixo: cada pedido
  // pode disparar um e-mail.
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('esqueci-senha')
  async esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    await this.authService.solicitarLink(dto.login);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('redefinir-senha')
  async redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    await this.authService.redefinirSenha(dto.token, dto.senhaNova);
    return { ok: true };
  }
}
