import { Body, Controller, Post, Get, Patch, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { Public } from '../../common/decorators/public.decorator';
import { UsuarioAutenticado } from '../../common/types/usuario-autenticado';
import { COOKIE_MAX_AGE_MS, COOKIE_NAME, cookieOptions } from '../../common/auth/cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
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
    return this.authService.me(req.user.id);
  }

  // Self-service — qualquer conta autenticada (PAROQUIA ou CONSELHO) troca a própria senha,
  // sem depender do Conselho pra resetar por fora. Útil pra virada de equipe dirigente todo
  // início de ano, por exemplo.
  @Patch('senha')
  async alterarSenha(
    @Body() dto: AlterarSenhaDto,
    @Req() req: Request & { user: UsuarioAutenticado },
  ) {
    await this.authService.alterarSenha(req.user.id, dto.senhaAtual, dto.senhaNova);
    return { ok: true };
  }
}
