import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedEquipesECargos } from './seed-equipes';
import { seedMontagemExemplo } from './seed-montagem-exemplo';
import { seedHistoricoEquipes } from './seed-historico-equipes';

// Dados fake pra popular a única paróquia em uso agora (ver docs/arquitetura.md, seção 5 —
// "seed de dados fake para testar a lógica de montagem antes de importar dados reais").
// Multi-paróquia/Conselho ficam para depois — por enquanto tudo cai numa paróquia só.
const PAROQUIA_ID = 'faeadeab-e731-4d83-92e5-7eedec743f12';
const PAROQUIA_NOME = 'Paróquia Desenvolvimento';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const NOMES_M = [
  'João', 'Pedro', 'Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Felipe', 'Bruno',
  'Daniel', 'Thiago', 'Vinícius', 'Gustavo', 'Igor', 'Marcos', 'André', 'Caio',
];
const NOMES_F = [
  'Maria', 'Ana', 'Beatriz', 'Camila', 'Fernanda', 'Juliana', 'Larissa', 'Mariana',
  'Patrícia', 'Rafaela', 'Sabrina', 'Talita', 'Vitória', 'Yasmin', 'Letícia', 'Carla',
];
const SOBRENOMES = [
  'Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Rodrigues', 'Almeida',
  'Nascimento', 'Lima', 'Araújo', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Barbosa',
];
const BAIRROS = ['Centro', 'São José', 'Pimenta', 'Seminário', 'Muriti', 'Lagoinha', 'Vila Alta'];
const IGREJAS = ['Paróquia Nossa Senhora', 'Capela São Sebastião', 'Paróquia Sagrado Coração'];
const INSTITUICOES = ['URCA', 'IFCE Campus Crato', 'Escola Estadual Padre Cícero', 'UFCA'];
const CORES: Array<'VERMELHO' | 'AZUL' | 'VERDE' | 'AMARELO' | 'ROSA' | 'LARANJA'> = [
  'VERMELHO', 'AZUL', 'VERDE', 'AMARELO', 'ROSA', 'LARANJA',
];
const MOTIVOS_DESATIVACAO = ['Mudou de cidade', 'Não tem mais disponibilidade', 'A pedido da pessoa'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSeeded(seed: number, arr: unknown[]) {
  return arr[seed % arr.length];
}

function telefone(seed: number) {
  return `88 9${String(8000 + (seed * 37) % 1999).padStart(4, '0')}-${String((seed * 91) % 9000 + 1000)}`;
}

function nomeCompleto(seed: number, genero: 'M' | 'F') {
  const primeiro = pickSeeded(seed, genero === 'M' ? NOMES_M : NOMES_F) as string;
  const sobrenome1 = pickSeeded(seed * 3 + 1, SOBRENOMES) as string;
  const sobrenome2 = pickSeeded(seed * 7 + 5, SOBRENOMES) as string;
  return `${primeiro} ${sobrenome1} ${sobrenome2}`;
}

function endereco(seed: number) {
  return {
    logradouro: `Rua ${pickSeeded(seed, SOBRENOMES)}`,
    numero: String(100 + (seed * 13) % 900),
    bairro: pickSeeded(seed, BAIRROS) as string,
    cidade: 'Crato',
    estado: 'CE',
    cep: `63${String(100 + (seed * 17) % 800).padStart(3, '0')}-${String((seed * 29) % 900 + 100)}`,
  };
}

async function seedFichas() {
  await prisma.ficha.deleteMany({ where: { paroquiaId: PAROQUIA_ID } });

  const registros = Array.from({ length: 36 }, (_, i) => {
    const seed = i + 1;
    const genero: 'M' | 'F' = i % 2 === 0 ? 'M' : 'F';
    const numeroEncontro = 3 + (seed % 5); // encontros III a VII
    const inativa = seed % 9 === 0;

    return {
      paroquiaId: PAROQUIA_ID,
      nomeCompleto: nomeCompleto(seed, genero),
      sexo: genero === 'M' ? ('RAPAZ' as const) : ('MOCA' as const),
      dataNascimento: new Date(1998 + (seed % 10), seed % 12, 1 + (seed % 27)),
      naturalidade: 'Crato/CE',
      telefone: telefone(seed),
      email: seed % 4 === 0 ? undefined : `pessoa${seed}@example.com`,
      ...endereco(seed),
      nomePai: `${pickSeeded(seed + 11, NOMES_M)} ${pickSeeded(seed + 2, SOBRENOMES)}`,
      nomeMae: `${pickSeeded(seed + 13, NOMES_F)} ${pickSeeded(seed + 4, SOBRENOMES)}`,
      grauEscolaridade: seed % 3 === 0 ? 'Superior' : 'Médio',
      curso: seed % 3 === 0 ? 'Administração' : undefined,
      instituicao: seed % 3 === 0 ? (pickSeeded(seed, INSTITUICOES) as string) : undefined,
      situacaoEscolar: seed % 3 === 0 ? 'Cursando' : 'Formado',
      religiao: 'Católica',
      igrejaQueFrequenta: pickSeeded(seed, IGREJAS) as string,
      participaOutroMovimento: seed % 6 === 0,
      qualMovimento: seed % 6 === 0 ? 'Pastoral da Juventude' : undefined,
      sacramentoBatismo: true,
      sacramentoEucaristia: seed % 5 !== 0,
      sacramentoCrisma: seed % 3 === 0,
      nomeConvidante: `${pickSeeded(seed + 5, NOMES_F)} ${pickSeeded(seed + 6, SOBRENOMES)}`,
      telefoneConvidante: telefone(seed + 100),
      observacoes: seed % 7 === 0 ? 'Tem facilidade com música, já ajudou no Canto informalmente.' : undefined,
      numeroEncontro,
      corCirculo: pick(CORES),
      situacao: inativa ? ('INATIVA' as const) : ('ATIVA' as const),
      motivoDesativacao: inativa ? pick(MOTIVOS_DESATIVACAO) : undefined,
    };
  });

  await prisma.ficha.createMany({ data: registros });
  return registros.length;
}

async function seedFichasCasais() {
  await prisma.fichaCasal.deleteMany({ where: { paroquiaId: PAROQUIA_ID } });

  const registros = Array.from({ length: 12 }, (_, i) => {
    const seed = i + 1;
    const temFilhos = seed % 4 === 0;

    return {
      paroquiaId: PAROQUIA_ID,
      nomeEle: nomeCompleto(seed + 50, 'M'),
      nomeEla: nomeCompleto(seed + 60, 'F'),
      dataNascimentoEle: new Date(1980 + (seed % 15), seed % 12, 1 + (seed % 27)),
      dataNascimentoEla: new Date(1982 + (seed % 15), (seed + 3) % 12, 1 + (seed % 27)),
      telefoneEle: telefone(seed + 200),
      telefoneEla: telefone(seed + 300),
      emailEle: seed % 3 === 0 ? `casal${seed}.ele@example.com` : undefined,
      emailEla: seed % 3 === 0 ? `casal${seed}.ela@example.com` : undefined,
      ...endereco(seed + 20),
      temFilhosNoSegueMe: temFilhos,
      observacoesFilhos: temFilhos ? 'Filho(a) vivenciou o V Encontro.' : undefined,
      observacoes: seed % 5 === 0 ? 'Casal muito atuante na Eq. da Visitação.' : undefined,
      situacao: 'ATIVA' as const,
    };
  });

  await prisma.fichaCasal.createMany({ data: registros });
  return registros.length;
}

async function main() {
  await prisma.paroquia.upsert({
    where: { id: PAROQUIA_ID },
    update: {},
    create: { id: PAROQUIA_ID, nome: PAROQUIA_NOME },
  });

  const totalFichas = await seedFichas();
  const totalCasais = await seedFichasCasais();
  const { totalEquipes, totalCargos } = await seedEquipesECargos(prisma);
  const { totalVagas, totalAlocacoes } = await seedMontagemExemplo(prisma, PAROQUIA_ID);
  const historico = await seedHistoricoEquipes(prisma, PAROQUIA_ID);

  console.log(`Seed concluído: ${totalFichas} fichas (jovens) + ${totalCasais} casais na paróquia "${PAROQUIA_NOME}".`);
  console.log(`Catálogo de Montagem: ${totalEquipes} equipes, ${totalCargos} cargos.`);
  console.log(`Montagem de exemplo: ${totalVagas} vagas, ${totalAlocacoes} alocações.`);
  console.log(
    `Histórico: ${historico.totalMontagens} encontros passados, ${historico.totalVagas} vagas, ${historico.totalAlocacoes} alocações ACEITO.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
