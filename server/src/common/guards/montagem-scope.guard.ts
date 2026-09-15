import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioAutenticado } from '../types/usuario-autenticado';

// Complementa o ParoquiaScopeGuard nos controllers aninhados sob /montagens/:montagemId/*
// (Alocações, Lista de Substituição, Quadrantes) — esses recebem `montagemId` via @Param, não
// `paroquiaId` direto, então checar só o usuário não basta: precisa confirmar que a Montagem
// referenciada pertence à paróquia de quem está pedindo (R7). Exclusivo de conta PAROQUIA —
// Conselho não mexe nesses três recursos (só lê Montagem via módulo próprio).
@Injectable()
export class MontagemScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: UsuarioAutenticado }>();
    const montagemId = request.params?.montagemId;
    if (!montagemId) {
      return true;
    }

    const paroquiaId = request.user?.paroquiaId;
    if (!paroquiaId) {
      throw new NotFoundException(`Montagem ${montagemId} não encontrada`);
    }

    const montagem = await this.prisma.montagem.findUnique({ where: { id: montagemId } });
    if (!montagem || montagem.paroquiaId !== paroquiaId) {
      throw new NotFoundException(`Montagem ${montagemId} não encontrada`);
    }
    return true;
  }
}
