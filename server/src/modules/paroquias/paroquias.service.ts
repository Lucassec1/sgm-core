import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateParoquiaDto } from './dto/create-paroquia.dto';

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Gestão de paróquias e das contas de acesso compartilhadas (uma por paróquia, login = e-mail
// da paróquia) — restrita ao Conselho (R7/R8). O Conselho nunca define nem vê senha: cria a
// conta só com o e-mail, e a paróquia cria a senha pelo link do primeiro acesso. "1 conta por
// paróquia" é regra de negócio aqui, não constraint de banco (mais barato de relaxar depois).
@Injectable()
export class ParoquiasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const paroquias = await this.prisma.paroquia.findMany({
      orderBy: { nome: 'asc' },
      include: {
        usuarios: {
          where: { role: RoleUsuario.PAROQUIA },
          select: { id: true, login: true, ativo: true, senhaHash: true },
        },
      },
    });
    // O hash nunca sai daqui — só o fato de já existir senha (primeiro acesso feito ou não).
    return paroquias.map(({ usuarios, ...paroquia }) => ({
      ...paroquia,
      usuarios: usuarios.map(({ senhaHash, ...usuario }) => ({
        ...usuario,
        aguardandoPrimeiroAcesso: !senhaHash,
      })),
    }));
  }

  async create(dto: CreateParoquiaDto) {
    const email = normalizarEmail(dto.email);
    await this.garantirEmailLivre(email);

    return this.prisma.$transaction(async (tx) => {
      const paroquia = await tx.paroquia.create({ data: { nome: dto.nome.trim() } });
      await tx.usuario.create({
        data: { login: email, role: RoleUsuario.PAROQUIA, paroquiaId: paroquia.id },
      });
      return paroquia;
    });
  }

  // Paróquia criada sem conta (afilhada da implantação, criada pelo vínculo na Sementeira): o
  // Conselho libera o acesso depois, quando a equipe dirigente dela é formada (II encontro).
  async criarConta(paroquiaId: string, emailNovo: string) {
    const existente = await this.prisma.usuario.findFirst({
      where: { paroquiaId, role: RoleUsuario.PAROQUIA },
    });
    if (existente) {
      throw new ConflictException('Essa paróquia já tem conta — use alterar e-mail');
    }
    const email = normalizarEmail(emailNovo);
    await this.garantirEmailLivre(email);
    await this.prisma.usuario.create({
      data: { login: email, role: RoleUsuario.PAROQUIA, paroquiaId },
    });
    return { ok: true };
  }

  // Também serve pra migrar conta antiga (login = nome curto) pro e-mail da paróquia. A senha
  // atual continua valendo; links pendentes (mandados pro e-mail antigo) deixam de valer.
  async alterarEmail(paroquiaId: string, emailNovo: string) {
    const usuario = await this.usuarioDaParoquia(paroquiaId);
    const email = normalizarEmail(emailNovo);
    if (email !== usuario.login.toLowerCase()) {
      await this.garantirEmailLivre(email);
    }
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id: usuario.id }, data: { login: email } }),
      this.prisma.tokenRedefinicaoSenha.deleteMany({ where: { usuarioId: usuario.id } }),
    ]);
    return { ok: true };
  }

  // Virada de equipe ou suspeita de senha vazada: apaga a senha e derruba as sessões abertas.
  // A conta volta a "aguardando primeiro acesso" — quem tiver acesso ao e-mail cria a nova.
  async redefinirAcesso(paroquiaId: string) {
    const usuario = await this.usuarioDaParoquia(paroquiaId);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { senhaHash: null, ativo: true, senhaAlteradaEm: new Date() },
      }),
      this.prisma.tokenRedefinicaoSenha.deleteMany({ where: { usuarioId: usuario.id } }),
    ]);
    return { ok: true };
  }

  private async usuarioDaParoquia(paroquiaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { paroquiaId, role: RoleUsuario.PAROQUIA },
    });
    if (!usuario) {
      throw new NotFoundException(`Nenhuma conta encontrada pra paróquia ${paroquiaId}`);
    }
    return usuario;
  }

  private async garantirEmailLivre(email: string) {
    const emUso = await this.prisma.usuario.findFirst({
      where: { login: { equals: email, mode: 'insensitive' } },
    });
    if (emUso) {
      throw new ConflictException(`O e-mail ${email} já está cadastrado em outra conta`);
    }
  }
}
