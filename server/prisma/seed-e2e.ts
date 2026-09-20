import 'dotenv/config';
import { PrismaClient, RoleUsuario } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { seedEquipesECargos } from './seed-equipes';

// Seed mínimo pros testes E2E (Playwright, ver /e2e na raiz do monorepo) — roda contra um
// banco isolado (sgm_core_test, ver e2e/global-setup.ts), sem fichas/montagem de exemplo:
// só o necessário pra logar do zero e montar um encontro do zero (paróquia, credencial de
// dev — mesma do seed normal, pra reaproveitar o fluxo de login — e o catálogo de
// equipes/cargos, que R4/R6 dependem de existir).
const PAROQUIA_ID = 'e2e00000-0000-0000-0000-000000000001';
const PAROQUIA_NOME = 'Paróquia E2E';
const PAROQUIA_LOGIN_DEV = 'paroquia-dev';
const PAROQUIA_SENHA_DEV = 'paroquia-dev-123';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Banco dedicado a esses testes — seguro zerar tudo a cada run (ordem inversa de dependência).
async function limpar() {
  await prisma.logAtividade.deleteMany();
  await prisma.quadranteArquivo.deleteMany();
  await prisma.listaSubstituicao.deleteMany();
  await prisma.alocacao.deleteMany();
  await prisma.vagaMontagem.deleteMany();
  await prisma.observacaoMontagem.deleteMany();
  await prisma.montagem.deleteMany();
  await prisma.cargo.deleteMany();
  await prisma.equipe.deleteMany();
  await prisma.fichaCasal.deleteMany();
  await prisma.ficha.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.paroquia.deleteMany();
}

async function main() {
  await limpar();

  await prisma.paroquia.create({ data: { id: PAROQUIA_ID, nome: PAROQUIA_NOME } });

  const senhaHash = await bcrypt.hash(PAROQUIA_SENHA_DEV, 10);
  await prisma.usuario.create({
    data: {
      login: PAROQUIA_LOGIN_DEV,
      senhaHash,
      role: RoleUsuario.PAROQUIA,
      paroquiaId: PAROQUIA_ID,
    },
  });

  await seedEquipesECargos(prisma);

  console.log(`Seed E2E ok — login "${PAROQUIA_LOGIN_DEV}" / senha "${PAROQUIA_SENHA_DEV}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
