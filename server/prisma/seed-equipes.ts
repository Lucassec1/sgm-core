import { PrismaClient } from '@prisma/client';

// Catálogo das 16 equipes do encontro (Comando Geral + 15) e seus cargos — dados reais
// passados pelo Lucas (composição de coordenação/apoio/componentes por equipe). Ver
// docs/regras-imutaveis.md (R4, R6) e docs/requisitos.md (seção 3).
//
// Equipe dos Círculos é sempre a primeira a ser convidada (R4) — ordem 2, logo depois do
// Comando Geral (que cuida das outras 15 equipes na prática, por isso vem primeiro).
//
// Equipe da Visitação: coordenação é fixa (1 casal), mas o cargo "Componentes" tem
// quantidadeDinamica=true — sua quantidade real de casais é calculada na criação da
// Montagem, proporcional a numeroJovensVivenciando (~1 casal para cada 3 jovens, R6),
// não um número fixo de catálogo.

type CargoSeed = {
  nome: string;
  ordem: number;
  quantidadeCasais?: number;
  quantidadeRapazes?: number;
  quantidadeMocas?: number;
  quantidadeDinamica?: boolean;
  ehCoordenacao?: boolean;
};

type EquipeSeed = {
  nome: string;
  slug: string;
  ordem: number;
  ehCirculos?: boolean;
  // R4: false só pra Círculos e Comando Geral (podem convidar sem esperar os Círculos fecharem).
  bloqueiaConvitePosCirculos?: boolean;
  // R2: true só pra Visitação (aviso de repetição nunca bloqueia lá, mesmo passando de 3x).
  repeticaoLimiteFlexivel?: boolean;
  // R3, coordenação de casal: true só pra Visitação (as demais não exigem histórico pra casal coordenar).
  coordenacaoCasalExigeHistorico?: boolean;
  cargos: CargoSeed[];
};

export const EQUIPES: EquipeSeed[] = [
  {
    nome: 'Comando Geral',
    slug: 'comando-geral',
    ordem: 1,
    bloqueiaConvitePosCirculos: false,
    cargos: [
      { nome: 'Comandantes Gerais', ordem: 1, quantidadeCasais: 1, ehCoordenacao: true },
      { nome: 'Comandantes Jovens', ordem: 2, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
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
      { nome: 'Componentes', ordem: 2, quantidadeCasais: 6, quantidadeRapazes: 6, quantidadeMocas: 6 },
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
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeRapazes: 6, quantidadeMocas: 6 },
    ],
  },
  {
    nome: 'Equipe do Canto',
    slug: 'canto',
    ordem: 5,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
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
      { nome: 'Componentes', ordem: 3, quantidadeCasais: 3, quantidadeRapazes: 3, quantidadeMocas: 3 },
    ],
  },
  {
    nome: 'Equipe do Estacionamento',
    slug: 'estacionamento',
    ordem: 7,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeCasais: 1, quantidadeRapazes: 3, quantidadeMocas: 3 },
    ],
  },
  {
    nome: 'Equipe da Faxina',
    slug: 'faxina',
    ordem: 8,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeCasais: 1, quantidadeRapazes: 4, quantidadeMocas: 4 },
    ],
  },
  {
    nome: 'Equipe da Gráfica',
    slug: 'grafica',
    ordem: 9,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeCasais: 1, quantidadeRapazes: 3, quantidadeMocas: 3 },
    ],
  },
  {
    nome: 'Equipe do Lanche',
    slug: 'lanche',
    ordem: 10,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeCasais: 1, quantidadeRapazes: 3, quantidadeMocas: 3 },
    ],
  },
  {
    nome: 'Equipe da Liturgia e Vigília',
    slug: 'liturgia-e-vigilia',
    ordem: 11,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
      { nome: 'Apoio', ordem: 2, quantidadeCasais: 1 },
      { nome: 'Componentes', ordem: 3, quantidadeCasais: 1, quantidadeRapazes: 6, quantidadeMocas: 6 },
    ],
  },
  {
    nome: 'Equipe do Minimercado',
    slug: 'minimercado',
    ordem: 12,
    cargos: [
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
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
      { nome: 'Coordenação', ordem: 1, quantidadeRapazes: 1, quantidadeMocas: 1, ehCoordenacao: true },
      // Um dos dois membros do Apoio costuma ser ministro da eucaristia — não modelado como
      // campo próprio nesta etapa, fica como observação de texto na Alocação se necessário.
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

export async function seedEquipesECargos(prisma: PrismaClient) {
  let totalEquipes = 0;
  let totalCargos = 0;

  for (const equipeSeed of EQUIPES) {
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
