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

  // Self-service — a própria equipe dirigente (ou o Conselho) troca a senha sem depender de
  // um reset externo. Exige a senha atual (evita que quem achar uma sessão aberta esquecida
  // troque a credencial sem saber a senha de verdade).
  async alterarSenha(usuarioId: string, senhaAtual: string, senhaNova: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new UnauthorizedException();
    }
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    const senhaHash = await bcrypt.hash(senhaNova, 10);
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
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
