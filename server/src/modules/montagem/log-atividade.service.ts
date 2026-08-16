import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// R9 — log de atividade da Montagem. Sem Auth real ainda, `usuario` é o que vier do DTO
// (digitado manualmente); na ausência, grava "sistema".
@Injectable()
export class LogAtividadeService {
  constructor(private readonly prisma: PrismaService) {}

  registrar(montagemId: string, usuario: string | undefined, acao: string, detalhes?: string) {
    return this.prisma.logAtividade.create({
      data: {
        montagemId,
        usuario: usuario?.trim() || 'sistema',
        acao,
        detalhes,
      },
    });
  }

  listar(montagemId: string) {
    return this.prisma.logAtividade.findMany({
      where: { montagemId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
