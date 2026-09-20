import { defineConfig, devices } from '@playwright/test';

// E2E dos dois fluxos críticos (docs/arquitetura.md, seção 5): Cadastro de Ficha e Montagem.
// Roda contra server+client de verdade (não mock), num banco isolado (sgm_core_test) — ver
// e2e/global-setup.ts — pra não sujar/depender dos dados de dev (docker-compose). Portas
// diferentes das de dev (3000/3001) de propósito, pra poder rodar em paralelo com
// `docker-compose up` sem conflito.
export const SERVER_PORT = 3011;
export const CLIENT_PORT = 3010;
export const TEST_DATABASE_URL = 'postgresql://sgm:sgm@localhost:5432/sgm_core_test?schema=public';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: './server',
      url: `http://localhost:${SERVER_PORT}/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        PORT: String(SERVER_PORT),
        JWT_SECRET: 'segredo-e2e-nao-usar-em-producao',
        JWT_EXPIRES_IN: '12h',
        CORS_ORIGINS: `http://localhost:${CLIENT_PORT}`,
        LOG_LEVEL: 'error',
        // Fotos/Quadrantes (S3) não entram nos dois fluxos testados — credenciais fake bastam
        // pra subir o Nest (o módulo de upload só é exercitado se o endpoint for chamado).
        AWS_REGION: 'us-east-1',
        S3_BUCKET_NAME: 'sgm-core-uploads-e2e',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
      },
    },
    {
      command: `npm run dev -- -p ${CLIENT_PORT}`,
      cwd: './client',
      url: `http://localhost:${CLIENT_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NEXT_PUBLIC_API_URL: `http://localhost:${SERVER_PORT}`,
      },
    },
  ],
});
