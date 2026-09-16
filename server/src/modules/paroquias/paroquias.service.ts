import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateParoquiaDto } from './dto/create-paroquia.dto';
import { ResetCredenciaisDto } from './dto/reset-credenciais.dto';

const SALT_ROUNDS = 10;

// Gestão de paróquias e das credenciais compartilhadas de acesso (login por paróquia — ver
// docs/producao.md, bloqueador #3) — restrita ao Conselho (R7/R8). "1 conta por paróquia" é
// regra de negócio aqui, não constraint de banco (mais barato de relaxar depois, ex. staging
// de senha nova, do que reforçar).
@Injectable()
export class ParoquiasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.paroquia.findMany({
      orderBy: { nome: 'asc' },
      include: {
        usuarios: {
          where: { role: RoleUsuario.PAROQUIA },
          select: { id: true, login: true, ativo: true },
        },
      },
    });
  }

  async create(dto: CreateParoquiaDto) {
    const loginEmUso = await this.prisma.usuario.findUnique({ where: { login: dto.login } });
    if (loginEmUso) {
      throw new ConflictException(`Login "${dto.login}" já está em uso`);
    }

    const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const paroquia = await tx.paroquia.create({ data: { nome: dto.nome } });
      await tx.usuario.create({
        data: { login: dto.login, senhaHash, role: RoleUsuario.PAROQUIA, paroquiaId: paroquia.id },
      });
      return paroquia;
    });
  }

  async resetCredenciais(paroquiaId: string, dto: ResetCredenciaisDto) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { paroquiaId, role: RoleUsuario.PAROQUIA },
    });
    if (!usuario) {
      throw new NotFoundException(`Nenhuma credencial encontrada pra paróquia ${paroquiaId}`);
    }

    const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS);
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash, ativo: true },
    });
    return { ok: true };
  }
}
