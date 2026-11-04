import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';

// Link de criar/redefinir senha: vale 30 min, uso único. Um pedido novo pra mesma conta dentro
// de 2 min é ignorado em silêncio (evita encher a caixa de alguém clicando várias vezes).
const VALIDADE_TOKEN_MS = 30 * 60 * 1000;
const INTERVALO_MINIMO_PEDIDOS_MS = 2 * 60 * 1000;

const PARECE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // Login é o e-mail da paróquia — sem diferenciar maiúsculas (ninguém lembra se cadastrou
  // "Paroquia@gmail.com" ou "paroquia@gmail.com").
  private buscarPorLogin(login: string) {
    return this.prisma.usuario.findFirst({
      where: { login: { equals: login.trim(), mode: 'insensitive' } },
    });
  }

  async validarUsuario(login: string, senha: string) {
    const usuario = await this.buscarPorLogin(login);
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Login ou senha inválidos');
    }
    // Primeiro acesso (conta criada pelo Conselho, ainda sem senha): em vez de pedir a senha,
    // manda o link de criar senha pro e-mail. Quem só sabe o e-mail não consegue tomar a conta
    // — precisa abrir a caixa de entrada.
    if (!usuario.senhaHash) {
      await this.enviarLink(usuario);
      throw new ForbiddenException({
        code: 'PRIMEIRO_ACESSO',
        message: 'Primeiro acesso: enviamos um link para o e-mail da conta para criar a senha.',
      });
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
      emitidoEm: Date.now(),
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
    const senhaValida =
      !!usuario.senhaHash && (await bcrypt.compare(senhaAtual, usuario.senhaHash));
    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    const senhaHash = await bcrypt.hash(senhaNova, 10);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { senhaHash, senhaAlteradaEm: new Date() },
      }),
      // link pedido antes da troca não vale mais
      this.prisma.tokenRedefinicaoSenha.deleteMany({ where: { usuarioId } }),
    ]);
  }

  // "Primeiro acesso ou esqueceu a senha?" — manda o link pro e-mail da conta. Sempre termina
  // sem erro, exista a conta ou não: a resposta não pode revelar quais e-mails estão cadastrados.
  async solicitarLink(login: string): Promise<void> {
    const usuario = await this.buscarPorLogin(login);
    if (!usuario || !usuario.ativo) return;
    await this.enviarLink(usuario);
  }

  private async enviarLink(usuario: Usuario): Promise<void> {
    // Conta antiga com login que não é e-mail (de antes do login por e-mail): não tem pra onde
    // mandar — o Conselho precisa trocar o login pelo e-mail da paróquia.
    if (!PARECE_EMAIL.test(usuario.login)) return;

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
    const primeiroAcesso = !usuario.senhaHash;
    const pedido = primeiroAcesso
      ? `Esta conta (${usuario.login}) foi cadastrada no SGM Core e ainda não tem senha.`
      : `Alguém pediu para redefinir a senha da conta ${usuario.login} no SGM Core.`;
    const acao = primeiroAcesso ? 'Criar minha senha' : 'Criar uma senha nova';
    await this.emailService.enviar({
      para: usuario.login,
      assunto: primeiroAcesso ? 'SGM Core — crie sua senha' : 'SGM Core — redefinir senha',
      texto: [
        pedido,
        '',
        `${acao}: abra o link abaixo (vale por 30 minutos, uma vez só):`,
        link,
        '',
        'Se não foi você ou alguém da sua equipe, ignore este e-mail.',
      ].join('\n'),
      html: `<p>${pedido}</p>
<p><a href="${link}">${acao}</a> — o link vale por 30 minutos, uma vez só.</p>
<p>Se não foi você ou alguém da sua equipe, ignore este e-mail.</p>`,
    });
  }

  // Destino do link: cria a senha (primeiro acesso) ou troca (esqueceu) — mesmo caminho.
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
      paroquia: usuario.paroquia,
    };
  }
}
