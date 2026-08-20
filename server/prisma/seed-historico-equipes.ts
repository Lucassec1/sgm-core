import { PrismaClient, StatusConvite, TipoPessoa } from '@prisma/client';

// Massa de dados de HISTÓRICO: 3 encontros passados e finalizados, com alocações ACEITO
// espalhadas pelas equipes — pra testar Histórico de Equipes (Ficha), avaliação
// (pode coordenar/palestrar/observação), R2 (repetição, inclusive até bater no limite de
// 3x) e R3 (Grupo A — quem já serviu numa equipe vira sugestão de coordenador nela).
//
// numeroEncontro negativo (-3, -2, -1) só pra não colidir com a montagem de exemplo
// (numeroEncontro: 1, ver seed-montagem-exemplo.ts) — não representa numeração real.
// Idempotente: apaga só as próprias montagens de histórico antes de recriar.
export async function seedHistoricoEquipes(prisma: PrismaClient, paroquiaId: string) {
  const antigas = await prisma.montagem.findMany({
    where: { paroquiaId, numeroEncontro: { lt: 0 } },
    select: { id: true },
  });
  const idsAntigas = antigas.map((m) => m.id);
  if (idsAntigas.length) {
    await prisma.logAtividade.deleteMany({ where: { montagemId: { in: idsAntigas } } });
    await prisma.listaSubstituicao.deleteMany({ where: { montagemId: { in: idsAntigas } } });
    await prisma.alocacao.deleteMany({ where: { vagaMontagem: { montagemId: { in: idsAntigas } } } });
    await prisma.vagaMontagem.deleteMany({ where: { montagemId: { in: idsAntigas } } });
    await prisma.montagem.deleteMany({ where: { id: { in: idsAntigas } } });
  }

  const fichasAtivas = await prisma.ficha.findMany({ where: { paroquiaId, situacao: 'ATIVA' }, orderBy: { id: 'asc' } });
  const casaisAtivos = await prisma.fichaCasal.findMany({ where: { paroquiaId, situacao: 'ATIVA' }, orderBy: { id: 'asc' } });
  const cargos = await prisma.cargo.findMany({ include: { equipe: true } });

  const fichasRapazes = fichasAtivas.filter((f) => f.sexo === 'RAPAZ');
  const fichasMocas = fichasAtivas.filter((f) => f.sexo === 'MOCA');
  if (fichasRapazes.length < 5 || fichasMocas.length < 5 || casaisAtivos.length < 5) {
    throw new Error('seedHistoricoEquipes precisa de pelo menos 5 rapazes, 5 moças e 5 casais ATIVA.');
  }

  const OBSERVACOES = [
    'Muito comunicativo(a), ótimo(a) com o grupo.',
    'Cumpriu bem as tarefas, pontual nos horários.',
    'Teve dificuldade de trabalhar em equipe nessa edição.',
    'Demonstrou liderança natural, se destacou.',
    undefined,
    undefined,
  ];

  const DIAS_ATRAS = [400, 250, 100];
  let totalVagas = 0;
  let totalAlocacoes = 0;

  for (let m = 0; m < DIAS_ATRAS.length; m++) {
    const numeroEncontro = -(DIAS_ATRAS.length - m); // -3, -2, -1 (do mais antigo pro mais recente)
    const numeroJovensVivenciando = 45 + m * 3;
    const casaisVisitacao = Math.ceil(numeroJovensVivenciando / 3);

    const montagem = await prisma.montagem.create({
      data: {
        paroquiaId,
        numeroEncontro,
        data: new Date(Date.now() - 1000 * 60 * 60 * 24 * DIAS_ATRAS[m]),
        padroeiro: 'Nossa Senhora do Perpétuo Socorro',
        diretorEspiritual: 'Pe. José Antônio',
        status: 'FINALIZADA',
        numeroJovensVivenciando,
      },
    });

    await prisma.vagaMontagem.createMany({
      data: cargos.map((cargo) => ({
        montagemId: montagem.id,
        equipeId: cargo.equipeId,
        cargoId: cargo.id,
        quantidadeCasais: cargo.quantidadeDinamica ? casaisVisitacao : cargo.quantidadeCasais,
        quantidadeRapazes: cargo.quantidadeRapazes,
        quantidadeMocas: cargo.quantidadeMocas,
      })),
    });
    const vagas = await prisma.vagaMontagem.findMany({ where: { montagemId: montagem.id }, include: { cargo: true } });
    totalVagas += vagas.length;

    type NovaAlocacao = {
      vagaMontagemId: string;
      tipoPessoa: TipoPessoa;
      fichaId?: string;
      fichaCasalId?: string;
      status: StatusConvite;
      podeCoordenar?: boolean;
      podePalestrar?: boolean;
      observacoesAvaliacao?: string;
    };
    const alocacoes: NovaAlocacao[] = [];
    let obsIdx = 0;

    vagas.forEach((vaga, vagaIdx) => {
      // Vagas de Coordenação: mesmo índice em toda edição (sem deslocar por `m`) — a mesma
      // pessoa "sempre" coordena aquela equipe nas 3 edições, virando Grupo A garantido pro
      // R3 e batendo no limite de 3x do R2 pra dar pra testar o bloqueio.
      // Vagas normais: desloca por `m` pra espalhar entre gente diferente a cada edição.
      const deslocamento = vaga.cargo.ehCoordenacao ? 0 : m * 7;

      for (let i = 0; i < vaga.quantidadeRapazes; i++) {
        const idx = (vagaIdx + deslocamento + i) % fichasRapazes.length;
        alocacoes.push({
          vagaMontagemId: vaga.id,
          tipoPessoa: 'JOVEM',
          fichaId: fichasRapazes[idx].id,
          status: StatusConvite.ACEITO,
          podeCoordenar: vaga.cargo.ehCoordenacao || undefined,
          observacoesAvaliacao: OBSERVACOES[obsIdx++ % OBSERVACOES.length],
        });
      }
      for (let i = 0; i < vaga.quantidadeMocas; i++) {
        const idx = (vagaIdx + deslocamento + i) % fichasMocas.length;
        alocacoes.push({
          vagaMontagemId: vaga.id,
          tipoPessoa: 'JOVEM',
          fichaId: fichasMocas[idx].id,
          status: StatusConvite.ACEITO,
          podeCoordenar: vaga.cargo.ehCoordenacao || undefined,
          observacoesAvaliacao: OBSERVACOES[obsIdx++ % OBSERVACOES.length],
        });
      }
      for (let i = 0; i < vaga.quantidadeCasais; i++) {
        const idx = (vagaIdx + deslocamento + i) % casaisAtivos.length;
        alocacoes.push({
          vagaMontagemId: vaga.id,
          tipoPessoa: 'CASAL',
          fichaCasalId: casaisAtivos[idx].id,
          status: StatusConvite.ACEITO,
          podeCoordenar: vaga.cargo.ehCoordenacao || undefined,
          podePalestrar: vaga.cargo.ehCoordenacao && idx % 2 === 0,
          observacoesAvaliacao: OBSERVACOES[obsIdx++ % OBSERVACOES.length],
        });
      }
    });

    await prisma.alocacao.createMany({ data: alocacoes });
    await prisma.logAtividade.create({
      data: {
        montagemId: montagem.id,
        usuario: 'sistema',
        acao: 'CRIOU_MONTAGEM',
        detalhes: `Encontro histórico (seed) — ${alocacoes.length} alocações`,
      },
    });
    totalAlocacoes += alocacoes.length;
  }

  return { totalMontagens: DIAS_ATRAS.length, totalVagas, totalAlocacoes };
}
