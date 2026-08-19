import { PrismaClient, StatusConvite, TipoPessoa } from '@prisma/client';

// Massa de dados pra testar o módulo Montagem: cria UMA montagem de exemplo pra
// PAROQUIA_ID (ver seed.ts), com vagas instanciadas (igual ao MontagensService.create) e
// alocações em estágios variados — pra dar pra exercitar R1-R6/R9 direto via API sem precisar
// montar tudo na mão. Escreve direto no banco via Prisma (não passa pelas Services), então as
// validações de negócio não rodam aqui — os dados já nascem consistentes com as regras.
//
// Idempotente: apaga qualquer Montagem anterior da paróquia antes de recriar.
export async function seedMontagemExemplo(prisma: PrismaClient, paroquiaId: string) {
  const antigas = await prisma.montagem.findMany({ where: { paroquiaId }, select: { id: true } });
  const idsAntigas = antigas.map((m) => m.id);
  if (idsAntigas.length) {
    await prisma.logAtividade.deleteMany({ where: { montagemId: { in: idsAntigas } } });
    await prisma.listaSubstituicao.deleteMany({ where: { montagemId: { in: idsAntigas } } });
    await prisma.alocacao.deleteMany({ where: { vagaMontagem: { montagemId: { in: idsAntigas } } } });
    await prisma.vagaMontagem.deleteMany({ where: { montagemId: { in: idsAntigas } } });
    await prisma.montagem.deleteMany({ where: { id: { in: idsAntigas } } });
  }

  const fichasAtivas = await prisma.ficha.findMany({ where: { paroquiaId, situacao: 'ATIVA' }, orderBy: { numeroEncontro: 'desc' } });
  const casaisAtivos = await prisma.fichaCasal.findMany({ where: { paroquiaId, situacao: 'ATIVA' } });
  if (fichasAtivas.length < 10 || casaisAtivos.length < 5) {
    throw new Error('seedMontagemExemplo precisa de pelo menos 10 fichas e 5 casais ATIVA — rode o seed de fichas antes.');
  }

  // R3, Grupo B: marca 2 jovens + 1 casal como "já foi Equipe Dirigente", pra dar exemplo de
  // gente elegível a coordenar mesmo sem ter servido antes naquela equipe específica.
  const dirigentesJovens = fichasAtivas.slice(0, 2);
  const dirigenteCasal = casaisAtivos[0];
  await prisma.ficha.updateMany({
    where: { id: { in: dirigentesJovens.map((f) => f.id) } },
    data: { jaFoiEquipeDirigente: true },
  });
  await prisma.fichaCasal.update({ where: { id: dirigenteCasal.id }, data: { jaFoiEquipeDirigente: true } });

  const numeroJovensVivenciando = 45;
  const casaisVisitacao = Math.ceil(numeroJovensVivenciando / 3);

  const montagem = await prisma.montagem.create({
    data: {
      paroquiaId,
      numeroEncontro: 1,
      data: new Date(Date.now() + 1000 * 60 * 60 * 24 * 110), // ~110 dias à frente
      padroeiro: 'Nossa Senhora do Perpétuo Socorro',
      diretorEspiritual: 'Pe. José Antônio',
      numeroJovensVivenciando,
    },
  });

  const cargos = await prisma.cargo.findMany({ include: { equipe: true } });
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

  const vagas = await prisma.vagaMontagem.findMany({
    where: { montagemId: montagem.id },
    include: { equipe: true, cargo: true },
  });
  const vaga = (slug: string, cargoNome: string) => {
    const v = vagas.find((x) => x.equipe.slug === slug && x.cargo.nome === cargoNome);
    if (!v) throw new Error(`Vaga não encontrada: ${slug} / ${cargoNome}`);
    return v;
  };

  // pula os índices já usados como "dirigentes" pra não repetir sem querer
  let jIdx = 2;
  let cIdx = 1;
  const nextJovem = () => fichasAtivas[jIdx++ % fichasAtivas.length];
  const nextCasal = () => casaisAtivos[cIdx++ % casaisAtivos.length];

  type NovaAlocacao = {
    vagaMontagemId: string;
    tipoPessoa: TipoPessoa;
    fichaId?: string;
    fichaCasalId?: string;
    status: StatusConvite;
    motivoRecusa?: string;
  };
  const alocacoes: NovaAlocacao[] = [];

  const add = (
    vagaObj: (typeof vagas)[number],
    tipoPessoa: TipoPessoa,
    pessoaId: string,
    status: StatusConvite,
    motivoRecusa?: string,
  ) => {
    alocacoes.push({
      vagaMontagemId: vagaObj.id,
      tipoPessoa,
      ...(tipoPessoa === 'JOVEM' ? { fichaId: pessoaId } : { fichaCasalId: pessoaId }),
      status,
      motivoRecusa,
    });
  };

  // Comando Geral — completo e aceito (é quem cuida das outras 15 equipes)
  add(vaga('comando-geral', 'Comandantes Gerais'), 'CASAL', dirigenteCasal.id, StatusConvite.ACEITO);
  add(vaga('comando-geral', 'Comandantes Jovens'), 'JOVEM', dirigentesJovens[0].id, StatusConvite.ACEITO);
  add(vaga('comando-geral', 'Comandantes Jovens'), 'JOVEM', dirigentesJovens[1].id, StatusConvite.ACEITO);

  // Eq. dos Círculos — fechada (tudo ACEITO), já libera o convite das outras 14 equipes (R4)
  add(vaga('circulos', 'Coordenação'), 'CASAL', nextCasal().id, StatusConvite.ACEITO);
  for (let i = 0; i < 3; i++) add(vaga('circulos', 'Componentes'), 'CASAL', nextCasal().id, StatusConvite.ACEITO);
  for (let i = 0; i < 4; i++) add(vaga('circulos', 'Componentes'), 'JOVEM', nextJovem().id, StatusConvite.ACEITO);

  // Eq. da Animação — coordenação já convidada (Grupo B), resto em progresso
  add(vaga('animacao', 'Coordenação'), 'JOVEM', dirigentesJovens[1].id, StatusConvite.CONVIDADO);
  add(vaga('animacao', 'Apoio'), 'CASAL', nextCasal().id, StatusConvite.RASCUNHO);
  add(vaga('animacao', 'Componentes'), 'JOVEM', nextJovem().id, StatusConvite.ACEITO);
  add(vaga('animacao', 'Componentes'), 'JOVEM', nextJovem().id, StatusConvite.CONVIDADO);
  add(vaga('animacao', 'Componentes'), 'JOVEM', nextJovem().id, StatusConvite.RASCUNHO);

  // Eq. da Cozinha — mostra recusa (R1) seguida de realocação
  add(vaga('cozinha', 'Componentes'), 'JOVEM', nextJovem().id, StatusConvite.RECUSADO, 'Mudança de cidade de última hora');
  add(vaga('cozinha', 'Componentes'), 'JOVEM', nextJovem().id, StatusConvite.RASCUNHO);

  // Eq. do Lanche — estágio inicial (só um rascunho)
  add(vaga('lanche', 'Apoio'), 'CASAL', nextCasal().id, StatusConvite.RASCUNHO);

  await prisma.alocacao.createMany({ data: alocacoes });

  await prisma.logAtividade.createMany({
    data: [
      { montagemId: montagem.id, usuario: 'Lucas', acao: 'CRIOU_MONTAGEM', detalhes: 'Encontro nº 1 (exemplo)' },
      { montagemId: montagem.id, usuario: 'Lucas', acao: 'FECHOU_CIRCULOS', detalhes: 'Eq. dos Círculos 100% aceita' },
      { montagemId: montagem.id, usuario: 'Lucas', acao: 'REGISTROU_RECUSA', detalhes: 'Eq. da Cozinha — mudança de cidade' },
    ],
  });

  return { montagemId: montagem.id, totalVagas: vagas.length, totalAlocacoes: alocacoes.length };
}
