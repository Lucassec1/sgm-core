import { PrismaClient, StatusConvite, TipoPessoa } from '@prisma/client';

const MAX_SERVICOS_POR_PESSOA = 3;

// Massa de dados de HISTÓRICO: 3 encontros passados e finalizados, com alocações ACEITO
// espalhadas pelas equipes — pra testar Histórico de Equipes (Ficha), avaliação (pode
// coordenar/palestrar), R2 (repetição) e R3 (Grupo A — quem já serviu numa equipe vira
// sugestão de coordenador nela). Cada jovem/casal serve no máximo
// MAX_SERVICOS_POR_PESSOA vezes no total (não em cada vaga) — histórico enxuto de
// propósito, pra dar pra revisar pessoa por pessoa sem massa de dados demais.
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

  // Cria os 3 encontros passados (com o catálogo inteiro de vagas cada um, igual a uma
  // montagem de verdade) antes de decidir quem serviu onde.
  const DIAS_ATRAS = [400, 250, 100];
  const montagens: { id: string }[] = [];
  let totalVagas = 0;

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
    montagens.push(montagem);

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
  }

  const todasVagas = await prisma.vagaMontagem.findMany({
    where: { montagemId: { in: montagens.map((m) => m.id) } },
    include: { cargo: true },
  });
  totalVagas = todasVagas.length;

  const vagasRapaz = todasVagas.filter((v) => v.quantidadeRapazes > 0);
  const vagasMoca = todasVagas.filter((v) => v.quantidadeMocas > 0);
  const vagasCasal = todasVagas.filter((v) => v.quantidadeCasais > 0);

  type NovaAlocacao = {
    vagaMontagemId: string;
    tipoPessoa: TipoPessoa;
    fichaId?: string;
    fichaCasalId?: string;
    status: StatusConvite;
    podeCoordenar?: boolean;
    podePalestrar?: boolean;
  };
  const alocacoes: NovaAlocacao[] = [];

  // Escolhe até MAX_SERVICOS_POR_PESSOA vagas compatíveis pra uma pessoa (índice `idx`
  // dentro da lista dela). A cada 4ª pessoa, o 2º serviço repete a mesma equipe do 1º (em
  // outra vaga/montagem) — dá pra ver repetição (R2) sem exagerar na quantidade.
  function escolherVagas(vagas: typeof todasVagas, idx: number) {
    const qtd = 1 + (idx % MAX_SERVICOS_POR_PESSOA);
    const escolhidas = [vagas[idx % vagas.length]];

    for (let s = 1; s < qtd; s++) {
      if (s === 1 && idx % 4 === 0) {
        const equipeId = escolhidas[0].equipeId;
        const mesmaEquipe = vagas.find((v) => v.equipeId === equipeId && v.id !== escolhidas[0].id);
        escolhidas.push(mesmaEquipe ?? vagas[(idx + s * 5) % vagas.length]);
      } else {
        escolhidas.push(vagas[(idx + s * 5) % vagas.length]);
      }
    }
    return escolhidas;
  }

  fichasRapazes.forEach((ficha, idx) => {
    for (const vaga of escolherVagas(vagasRapaz, idx)) {
      alocacoes.push({
        vagaMontagemId: vaga.id,
        tipoPessoa: 'JOVEM',
        fichaId: ficha.id,
        status: StatusConvite.ACEITO,
        podeCoordenar: vaga.cargo.ehCoordenacao || undefined,
      });
    }
  });

  fichasMocas.forEach((ficha, idx) => {
    for (const vaga of escolherVagas(vagasMoca, idx)) {
      alocacoes.push({
        vagaMontagemId: vaga.id,
        tipoPessoa: 'JOVEM',
        fichaId: ficha.id,
        status: StatusConvite.ACEITO,
        podeCoordenar: vaga.cargo.ehCoordenacao || undefined,
      });
    }
  });

  casaisAtivos.forEach((casal, idx) => {
    for (const vaga of escolherVagas(vagasCasal, idx)) {
      alocacoes.push({
        vagaMontagemId: vaga.id,
        tipoPessoa: 'CASAL',
        fichaCasalId: casal.id,
        status: StatusConvite.ACEITO,
        podeCoordenar: vaga.cargo.ehCoordenacao || undefined,
        podePalestrar: vaga.cargo.ehCoordenacao && idx % 2 === 0,
      });
    }
  });

  await prisma.alocacao.createMany({ data: alocacoes });
  await prisma.logAtividade.createMany({
    data: montagens.map((montagem) => ({
      montagemId: montagem.id,
      usuario: 'sistema',
      acao: 'CRIOU_MONTAGEM',
      detalhes: 'Encontro histórico (seed)',
    })),
  });

  return { totalMontagens: montagens.length, totalVagas, totalAlocacoes: alocacoes.length };
}
