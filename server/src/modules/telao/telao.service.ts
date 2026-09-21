import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusConvite } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Endpoint público (sem login) pro modo telão/impressão (docs/historico/propostas.md, proposta #5) —
// projetado numa TV ou impresso no mural, sem sessão nenhuma. Por ser público, devolve só o
// mínimo necessário (nome + equipe + cargo dos ACEITOS): nada de telefone, endereço, avaliação
// ou dado de quem ainda não aceitou — mesmo cuidado que já existia na tela, agora também
// garantido pelo shape da resposta, não só pelo componente do client.
@Injectable()
export class TelaoService {
  constructor(private readonly prisma: PrismaService) {}

  async obterMontagem(id: string) {
    const montagem = await this.prisma.montagem.findUnique({
      where: { id },
      select: {
        id: true,
        numeroEncontro: true,
        data: true,
        padroeiro: true,
        vagas: {
          select: {
            id: true,
            equipe: { select: { id: true, nome: true, slug: true, ordem: true } },
            cargo: { select: { id: true, nome: true, ordem: true } },
            alocacoes: {
              where: { status: StatusConvite.ACEITO },
              select: {
                id: true,
                ficha: { select: { nomeCompleto: true } },
                fichaCasal: { select: { nomeEle: true, nomeEla: true } },
              },
            },
          },
          orderBy: [{ equipe: { ordem: 'asc' } }, { cargo: { ordem: 'asc' } }],
        },
      },
    });
    if (!montagem) {
      throw new NotFoundException(`Montagem ${id} não encontrada`);
    }
    return montagem;
  }
}
