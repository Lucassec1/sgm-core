import { createHash, randomBytes } from 'crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';

// Link de "esqueci a senha": vale 30 min, uso único. Um pedido novo pro mesmo login dentro de
// 2 min é ignorado em silêncio (evita encher a caixa de alguém clicando várias vezes).
const VALIDADE_TOKEN_MS = 30 * 60 * 1000;
const INTERVALO_MINIMO_PEDIDOS_MS = 2 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// URL do client pra montar o link do e-mail. CLIENT_URL explícita, senão a primeira origem do
// CORS_ORIGINS (que em produção é obrigatória e já é a URL da Vercel).
function urlDoClient(): string {
  const primeiraOrigem = process.env.CORS_ORIGINS?.split(',')[0]?.trim();
  return process.env.CLIENT_URL || primeiraOrigem || 'http://localhost:3000';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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
    await this.exigirSenhaAtual(usuarioId, senhaAtual);
    const senhaHash = await bcrypt.hash(senhaNova, 10);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { senhaHash, senhaAlteradaEm: new Date() },
      }),
      // link de redefinição pedido antes da troca não vale mais
      this.prisma.tokenRedefinicaoSenha.deleteMany({ where: { usuarioId } }),
    ]);
  }

  // E-mail que recebe o link de "esqueci a senha". Também exige a senha atual: quem achasse
  // uma sessão aberta poderia trocar pro próprio e-mail e depois tomar a conta.
  async alterarEmailRecuperacao(
    usuarioId: string,
    senhaAtual: string,
    email: string,
  ): Promise<void> {
    await this.exigirSenhaAtual(usuarioId, senhaAtual);
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { emailRecuperacao: email.trim().toLowerCase() },
    });
  }

  // Sempre termina sem erro, exista o login ou não, tenha e-mail ou não — a resposta não pode
  // revelar quais logins existem nem quais têm e-mail cadastrado.
  async solicitarRedefinicao(login: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({ where: { login } });
    if (!usuario || !usuario.ativo || !usuario.emailRecuperacao) return;

    const pedidoRecente = await this.prisma.tokenRedefinicaoSenha.findFirst({
      where: {
        usuarioId: usuario.id,
        createdAt: { gt: new Date(Date.now() - INTERVALO_MINIMO_PEDIDOS_MS) },
      },
    });
    if (pedidoRecente) return;

    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.tokenRedefinicaoSenha.deleteMany({ where: { usuarioId: usuario.id } }),
      this.prisma.tokenRedefinicaoSenha.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          expiraEm: new Date(Date.now() + VALIDADE_TOKEN_MS),
        },
      }),
    ]);

    // Token no fragmento (#), não na query string: o fragmento não sai do navegador, então
    // não fica em log de servidor/proxy nem no Referer.
    const link = `${urlDoClient()}/redefinir-senha#token=${token}`;
    await this.emailService.enviar({
      para: usuario.emailRecuperacao,
      assunto: 'SGM Core — redefinir senha',
      texto: [
        `Alguém pediu para redefinir a senha do login "${usuario.login}" no SGM Core.`,
        '',
        'Para criar uma senha nova, abra o link abaixo (vale por 30 minutos, uma vez só):',
        link,
        '',
        'Se não foi você ou alguém da sua equipe, ignore este e-mail — a senha atual continua valendo.',
      ].join('\n'),
      html: `<p>Alguém pediu para redefinir a senha do login <strong>${usuario.login}</strong> no SGM Core.</p>
<p><a href="${link}">Criar uma senha nova</a> — o link vale por 30 minutos, uma vez só.</p>
<p>Se não foi você ou alguém da sua equipe, ignore este e-mail: a senha atual continua valendo.</p>`,
    });
  }

  async redefinirSenha(token: string, senhaNova: string): Promise<void> {
    const registro = await this.prisma.tokenRedefinicaoSenha.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { usuario: { select: { ativo: true } } },
    });
    if (
      !registro ||
      registro.usadoEm ||
      registro.expiraEm < new Date() ||
      !registro.usuario.ativo
    ) {
      throw new BadRequestException('Link inválido ou expirado. Peça um novo.');
    }

    const senhaHash = await bcrypt.hash(senhaNova, 10);
    await this.prisma.$transaction([
      // senhaAlteradaEm derruba as sessões abertas com a senha antiga (ver JwtStrategy)
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { senhaHash, senhaAlteradaEm: new Date() },
      }),
      this.prisma.tokenRedefinicaoSenha.update({
        where: { id: registro.id },
        data: { usadoEm: new Date() },
      }),
      this.prisma.tokenRedefinicaoSenha.deleteMany({
        where: { usuarioId: registro.usuarioId, id: { not: registro.id } },
      }),
    ]);
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
      emailRecuperacao: usuario.emailRecuperacao,
      paroquia: usuario.paroquia,
    };
  }

  private async exigirSenhaAtual(usuarioId: string, senhaAtual: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new UnauthorizedException();
    }
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
  }
}
