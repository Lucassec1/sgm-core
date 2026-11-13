'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EQUIPES = void 0;
exports.seedEquipesECargos = seedEquipesECargos;
exports.EQUIPES = [
  {
    nome: 'Comando Geral',
    slug: 'comando-geral',
    ordem: 1,
    bloqueiaConvitePosCirculos: false,
    cargos: [
      { nome: 'Comandantes Gerais', ordem: 1, quantidadeCasais: 1, ehCoordenacao: true },
      {
        nome: 'Comandantes Jovens',
        ordem: 2,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
    ],
  },
  {
    nome: 'Equipe dos Círculos',
    slug: 'circulos',
    ordem: 2,
    ehCirculos: true,
    bloqueiaConvitePosCirculos: false,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeCasais: 1, ehCoordenacao: true },
      {
        nome: 'Componentes',
        ordem: 2,
        quantidadeCasais: 6,
        quantidadeRapazes: 6,
        quantidadeMocas: 6,
      },
    ],
  },
  {
    nome: 'Equipe Espiritualizadora',
    slug: 'espiritualizadora',
    ordem: 3,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeCasais: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeRapazes: 1, quantidadeMocas: 1 },
    ],
  },
  {
    nome: 'Equipe da Animação',
    slug: 'animacao',
    ordem: 4,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeRapazes: 6, quantidadeMocas: 6 },
    ],
  },
  {
    nome: 'Equipe do Canto',
    slug: 'canto',
    ordem: 5,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeRapazes: 4, quantidadeMocas: 4 },
    ],
  },
  {
    nome: 'Equipe da Cozinha',
    slug: 'cozinha',
    ordem: 6,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeCasais: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeRapazes: 1, quantidadeMocas: 1 },
      {
        nome: 'Componentes',
        ordem: 3,
        quantidadeCasais: 3,
        quantidadeRapazes: 3,
        quantidadeMocas: 3,
      },
    ],
  },
  {
    nome: 'Equipe do Estacionamento',
    slug: 'estacionamento',
    ordem: 7,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      {
        nome: 'Componentes',
        ordem: 3,
        quantidadeCasais: 1,
        quantidadeRapazes: 3,
        quantidadeMocas: 3,
      },
    ],
  },
  {
    nome: 'Equipe da Faxina',
    slug: 'faxina',
    ordem: 8,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      {
        nome: 'Componentes',
        ordem: 3,
        quantidadeCasais: 1,
        quantidadeRapazes: 4,
        quantidadeMocas: 4,
      },
    ],
  },
  {
    nome: 'Equipe da Gráfica',
    slug: 'grafica',
    ordem: 9,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      {
        nome: 'Componentes',
        ordem: 3,
        quantidadeCasais: 1,
        quantidadeRapazes: 3,
        quantidadeMocas: 3,
      },
    ],
  },
  {
    nome: 'Equipe do Lanche',
    slug: 'lanche',
    ordem: 10,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      {
        nome: 'Componentes',
        ordem: 3,
        quantidadeCasais: 1,
        quantidadeRapazes: 3,
        quantidadeMocas: 3,
      },
    ],
  },
  {
    nome: 'Equipe da Liturgia e Vigília',
    slug: 'liturgia-e-vigilia',
    ordem: 11,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      {
        nome: 'Componentes',
        ordem: 3,
        quantidadeCasais: 1,
        quantidadeRapazes: 6,
        quantidadeMocas: 6,
      },
    ],
  },
  {
    nome: 'Equipe do Minimercado',
    slug: 'minimercado',
    ordem: 12,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeRapazes: 2, quantidadeMocas: 2 },
    ],
  },
  {
    nome: 'Equipe do Prover',
    slug: 'prover',
    ordem: 13,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeCasais: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeRapazes: 1, quantidadeMocas: 1 },
    ],
  },
  {
    nome: 'Equipe da Sala',
    slug: 'sala',
    ordem: 14,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeCasais: 1, ehCoordenacao: true },
      { nome: 'Pilotos', ordem: 2, quantidadeRapazes: 1, quantidadeMocas: 1 },
      { nome: 'Copilotos', ordem: 3, quantidadeCasais: 1 },
      { nome: 'Aeromoça', ordem: 4, quantidadeMocas: 2 },
      { nome: 'Comissários de bordo', ordem: 5, quantidadeRapazes: 2 },
      { nome: 'Controle de voo', ordem: 6, quantidadeRapazes: 1, quantidadeMocas: 1 },
      { nome: 'Ligações', ordem: 7, quantidadeRapazes: 2, quantidadeMocas: 2 },
    ],
  },
  {
    nome: 'Equipe da Vigília Paroquial',
    slug: 'vigilia-paroquial',
    ordem: 15,
    cargos: [
      {
        nome: 'Coordenação',
        ordem: 1,
        quantidadeRapazes: 1,
        quantidadeMocas: 1,
        ehCoordenacao: true,
      },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeRapazes: 6, quantidadeMocas: 6 },
    ],
  },
  {
    nome: 'Equipe da Visitação',
    slug: 'visitacao',
    ordem: 16,
    repeticaoLimiteFlexivel: true,
    coordenacaoCasalExigeHistorico: true,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeCasais: 1, ehCoordenacao: true },
      { nome: 'Componentes', ordem: 2, quantidadeDinamica: true },
    ],
  },
];
async function seedEquipesECargos(prisma) {
  let totalEquipes = 0;
  let totalCargos = 0;
  for (const equipeSeed of exports.EQUIPES) {
    const equipe = await prisma.equipe.upsert({
      where: { slug: equipeSeed.slug },
      update: {
        nome: equipeSeed.nome,
        ordem: equipeSeed.ordem,
        ehCirculos: equipeSeed.ehCirculos ?? false,
        bloqueiaConvitePosCirculos: equipeSeed.bloqueiaConvitePosCirculos ?? true,
        repeticaoLimiteFlexivel: equipeSeed.repeticaoLimiteFlexivel ?? false,
        coordenacaoCasalExigeHistorico: equipeSeed.coordenacaoCasalExigeHistorico ?? false,
      },
      create: {
        nome: equipeSeed.nome,
        slug: equipeSeed.slug,
        ordem: equipeSeed.ordem,
        ehCirculos: equipeSeed.ehCirculos ?? false,
        bloqueiaConvitePosCirculos: equipeSeed.bloqueiaConvitePosCirculos ?? true,
        repeticaoLimiteFlexivel: equipeSeed.repeticaoLimiteFlexivel ?? false,
        coordenacaoCasalExigeHistorico: equipeSeed.coordenacaoCasalExigeHistorico ?? false,
      },
    });
    totalEquipes += 1;
    for (const cargoSeed of equipeSeed.cargos) {
      await prisma.cargo.upsert({
        where: { equipeId_nome: { equipeId: equipe.id, nome: cargoSeed.nome } },
        update: {
          ordem: cargoSeed.ordem,
          quantidadeCasais: cargoSeed.quantidadeCasais ?? 0,
          quantidadeRapazes: cargoSeed.quantidadeRapazes ?? 0,
          quantidadeMocas: cargoSeed.quantidadeMocas ?? 0,
          quantidadeDinamica: cargoSeed.quantidadeDinamica ?? false,
          ehCoordenacao: cargoSeed.ehCoordenacao ?? false,
        },
        create: {
          equipeId: equipe.id,
          nome: cargoSeed.nome,
          ordem: cargoSeed.ordem,
          quantidadeCasais: cargoSeed.quantidadeCasais ?? 0,
          quantidadeRapazes: cargoSeed.quantidadeRapazes ?? 0,
          quantidadeMocas: cargoSeed.quantidadeMocas ?? 0,
          quantidadeDinamica: cargoSeed.quantidadeDinamica ?? false,
          ehCoordenacao: cargoSeed.ehCoordenacao ?? false,
        },
      });
      totalCargos += 1;
    }
  }
  return { totalEquipes, totalCargos };
}
//# sourceMappingURL=seed-equipes.js.map
