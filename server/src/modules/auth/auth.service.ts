import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validarUsuario(login: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { login } });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Login ou senha inválidos');
    }
    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Login ou senha inválidos');
    }
    return usuario;
  }

  async login(usuario: { id: string; role: 'PAROQUIA' | 'CONSELHO'; paroquiaId: string | null }) {
    const token = await this.jwtService.signAsync({
      sub: usuario.id,
      role: usuario.role,
      paroquiaId: usuario.paroquiaId,
    });
    return token;
  }

  async me(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { paroquia: { select: { id: true, nome: true } } },
    });
    if (!usuario) {
      throw new UnauthorizedException();
    }
    return {
      id: usuario.id,
      login: usuario.login,
      role: usuario.role,
      nome: usuario.nome,
      paroquia: usuario.paroquia,
    };
  }
}
