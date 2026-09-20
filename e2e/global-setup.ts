import { execSync } from 'node:child_process';
import path from 'node:path';
import { TEST_DATABASE_URL } from '../playwright.config';

// Prepara o banco isolado dos testes E2E antes de subir server/client (ver playwright.config.ts,
// webServer): garante que o database existe, aplica as migrations e roda o seed mínimo
// (server/prisma/seed-e2e.ts). Assume Postgres do docker-compose já rodando — mesma instância
// de dev, banco separado (sgm_core_test), sem tocar nos dados de dev/seed normal.
const POSTGRES_CONTAINER = 'sgm-core-postgres';
const TEST_DB_NAME = 'sgm_core_test';

function garantirDatabase() {
  const jaExiste = execSync(
    `docker exec ${POSTGRES_CONTAINER} psql -U sgm -d sgm_core -tAc "SELECT 1 FROM pg_database WHERE datname = '${TEST_DB_NAME}'"`,
  )
    .toString()
    .trim();

  if (jaExiste !== '1') {
    execSync(
      `docker exec ${POSTGRES_CONTAINER} psql -U sgm -d sgm_core -c "CREATE DATABASE ${TEST_DB_NAME};"`,
      {
        stdio: 'inherit',
      },
    );
  }
}

export default async function globalSetup() {
  try {
    garantirDatabase();
  } catch {
    throw new Error(
      `Não consegui preparar o banco de teste — o container "${POSTGRES_CONTAINER}" está rodando? ` +
        '(docker-compose up, ver CLAUDE.md)',
    );
  }

  const serverDir = path.resolve(__dirname, '../server');
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };

  execSync('npx prisma migrate deploy', { cwd: serverDir, env, stdio: 'inherit' });
  execSync('npx ts-node prisma/seed-e2e.ts', { cwd: serverDir, env, stdio: 'inherit' });
}
