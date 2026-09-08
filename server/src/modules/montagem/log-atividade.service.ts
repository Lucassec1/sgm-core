import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// R9 — log de atividade da Montagem. Sem Auth real ainda, `usuario` é o que vier do DTO
// (digitado manualmente); na ausência, grava "sistema".
@Injectable()
export class LogAtividadeService {
  constructor(private readonly prisma: PrismaService) {}

  // `tx` permite gravar o log dentro da mesma transação da escrita que ele audita —
  // sem ele, uma falha no log deixaria a ação sem rastro (R9). Fora de transação,
  // usa o próprio PrismaService.
  registrar(
    montagemId: string,
    usuario: string | undefined,
    acao: string,
    detalhes?: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.logAtividade.create({
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
