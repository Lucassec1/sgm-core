import 'dotenv/config';
import { PrismaClient, RoleUsuario } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Script de bootstrap SEPARADO do seed.ts de dados fake — este aqui é seguro de rodar em
// produção (idempotente por `login`, não mexe em Ficha/FichaCasal/Montagem). Cria só a
// primeira conta de Conselho, necessária pra existir alguém que consiga criar as credenciais
// das paróquias (ver docs/producao.md, bloqueador #3, e docs/regras-imutaveis.md R7/R8) — sem
// isso não existe cadastro público de conta nenhuma no sistema.
//
// Uso: dentro de /server, com DATABASE_URL apontando pro banco certo:
//   SEED_CONSELHO_LOGIN=conselho.bootstrap SEED_CONSELHO_SENHA='senha-forte' SEED_CONSELHO_NOME='Nome da pessoa' \
//     npx ts-node prisma/seed-bootstrap-conselho.ts
// Rode uma vez só; depois disso, novas contas de Conselho e credenciais de paróquia são
// criadas pela própria interface (endpoints do módulo Conselho), logado com esta conta.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const login = process.env.SEED_CONSELHO_LOGIN;
  const senha = process.env.SEED_CONSELHO_SENHA;
  const nome = process.env.SEED_CONSELHO_NOME ?? 'Conselho (bootstrap)';

  if (!login || !senha) {
    throw new Error(
      'Defina SEED_CONSELHO_LOGIN e SEED_CONSELHO_SENHA antes de rodar este script (ver comentário no topo do arquivo).',
    );
  }
  if (senha.length < 8) {
    throw new Error('SEED_CONSELHO_SENHA precisa ter pelo menos 8 caracteres.');
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.upsert({
    where: { login },
    update: { senhaHash, nome, role: RoleUsuario.CONSELHO, ativo: true },
    create: { login, senhaHash, nome, role: RoleUsuario.CONSELHO },
  });

  console.log(`Conta de Conselho pronta: login="${usuario.login}" (id ${usuario.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
