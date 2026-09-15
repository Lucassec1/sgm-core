import { Body, Controller, Post, Get, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { UsuarioAutenticado } from '../../common/types/usuario-autenticado';

const COOKIE_NAME = 'sgm_token';
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h, alinhado ao JWT_EXPIRES_IN padrão do .env.example

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const usuario = await this.authService.validarUsuario(dto.login, dto.senha);
    const token = await this.authService.login(usuario);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    return this.authService.me(usuario.id);
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME);
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: Request & { user: UsuarioAutenticado }) {
    return this.authService.me(req.user.id);
  }
}
