import { Injectable } from '@nestjs/common';
import { StatusConvite } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import { buscarMontagemComVagas, garantirMontagemDaParoquia } from './montagem-da-paroquia';

// Leitura do que aconteceu na montagem: log de atividade (R9), observações do Conselho (R8) e o
// painel de resumo (proposta #2). Saiu do MontagensService (fase 2) — mesma lógica.
@Injectable()
export class ResumoMontagemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logAtividade: LogAtividadeService,
  ) {}

  async listarLog(montagemId: string, paroquiaId: string) {
    await garantirMontagemDaParoquia(this.prisma, montagemId, paroquiaId);
    return this.logAtividade.listar(montagemId);
  }

  // Leitura, pelo lado da paróquia, das observações que o Conselho deixou na montagem (R8) —
  // antes só o Conselho lia, e o retorno pra paróquia dependia de aviso fora do sistema. Escrita
  // continua exclusiva do Conselho (ConselhoMontagensController). Só o nome de quem escreveu sai,
  // nunca o id/usuário da conta.
  async listarObservacoes(montagemId: string, paroquiaId: string) {
    await garantirMontagemDaParoquia(this.prisma, montagemId, paroquiaId);
    return this.prisma.observacaoMontagem.findMany({
      where: { montagemId },
      select: { id: true, texto: true, createdAt: true, usuario: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Painel "como foi esse encontro" (docs/historico/propostas.md, proposta #2) — lê o LogAtividade (R9)
  // e a Alocacao já existentes, sem schema novo. Duas métricas do escopo original da proposta
  // não são calculáveis com o que o log guarda hoje e foram substituídas por uma versão
  // honesta do mesmo espírito:
  // - "tempo até 100% preenchida" -> vira "tempo até finalizar" (ATUALIZOU_ALOCACAO não grava
  //   qual vaga mudou de status, só o texto "status -> X", então não dá pra saber quando cada
  //   vaga bateu o total exigido — mas a finalização é um marco real e já fica no log).
  // - "equipe que demorou mais pra fechar" -> vira "equipe com mais movimentação" (contagem de
  //   CRIOU_ALOCACAO + REMOVEU_ALOCACAO por equipe — essas duas ações são as únicas que citam a
  //   equipe no `detalhes`; é um proxy de "quanto foi mexido", não de duração real).
  async resumo(montagemId: string, paroquiaId: string) {
    const montagem = await buscarMontagemComVagas(this.prisma, montagemId, paroquiaId);

    const [logsMovimentacao, totalRecusasDesistencias, totalSubstituicoes, duracaoMs] =
      await Promise.all([
        this.prisma.logAtividade.findMany({
          where: { montagemId, acao: { in: ['CRIOU_ALOCACAO', 'REMOVEU_ALOCACAO'] } },
          select: { detalhes: true },
        }),
        this.prisma.alocacao.count({
          where: {
            vagaMontagem: { montagemId },
            status: { in: [StatusConvite.RECUSADO, StatusConvite.DESISTIU] },
          },
        }),
        this.prisma.alocacao.count({
          where: { vagaMontagem: { montagemId }, status: StatusConvite.SUBSTITUIDO },
        }),
        this.duracaoAteFinalizarMs(montagemId, montagem.createdAt, montagem.status),
      ]);

    return {
      montagemId,
      numeroEncontro: montagem.numeroEncontro,
      status: montagem.status,
      duracaoMs,
      equipeMaisMovimentada: this.equipeComMaisMovimentacao(
        logsMovimentacao.map((l) => l.detalhes),
      ),
      totalRecusasDesistencias,
      totalSubstituicoes,
      historico: await this.historicoDuracao(montagem.paroquiaId, montagem.numeroEncontro),
    };
  }

  // `detalhes` de CRIOU_ALOCACAO/REMOVEU_ALOCACAO é sempre "<equipe> / <cargo>" (ver
  // alocacoes.service.ts) — extrai só a equipe pra contar movimentação por equipe.
  private equipeComMaisMovimentacao(detalhesDosLogs: (string | null)[]) {
    const contagem = new Map<string, number>();
    for (const detalhes of detalhesDosLogs) {
      const equipe = detalhes?.split(' / ')[0]?.trim();
      if (!equipe) continue;
      contagem.set(equipe, (contagem.get(equipe) ?? 0) + 1);
    }
    const [nome, movimentacoes] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return nome ? { nome, movimentacoes: movimentacoes as number } : null;
  }

  private async duracaoAteFinalizarMs(
    montagemId: string,
    criadoEm: Date,
    status: string,
  ): Promise<number | null> {
    if (status !== 'FINALIZADA') return null;
    // Se a montagem foi reaberta e finalizada de novo, usa a finalização mais recente —
    // é o marco de quando ela chegou no estado atual.
    const finalizacao = await this.prisma.logAtividade.findFirst({
      where: { montagemId, acao: 'MUDOU_STATUS', detalhes: { endsWith: '-> FINALIZADA' } },
      orderBy: { createdAt: 'desc' },
    });
    return finalizacao ? finalizacao.createdAt.getTime() - criadoEm.getTime() : null;
  }

  // Últimos até 3 encontros finalizados da mesma paróquia, antes deste — pra comparar "esse
  // encontro foi mais difícil de montar que o passado, ou foi impressão minha?" (proposta #2).
  private async historicoDuracao(paroquiaId: string, numeroEncontroAtual: number) {
    const anteriores = await this.prisma.montagem.findMany({
      where: { paroquiaId, status: 'FINALIZADA', numeroEncontro: { lt: numeroEncontroAtual } },
      orderBy: { numeroEncontro: 'desc' },
      take: 3,
      select: { id: true, numeroEncontro: true, createdAt: true, status: true },
    });

    return Promise.all(
      anteriores.reverse().map(async (m) => ({
        numeroEncontro: m.numeroEncontro,
        duracaoMs: await this.duracaoAteFinalizarMs(m.id, m.createdAt, m.status),
      })),
    );
  }
}
