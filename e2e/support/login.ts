import { type Page, expect } from '@playwright/test';

// Credenciais do seed E2E (server/prisma/seed-e2e.ts), no banco isolado de teste. A primeira é
// a mesma do seed normal (server/prisma/seed.ts).
export const CREDENCIAIS = {
  paroquia: { login: 'paroquia-dev', senha: 'paroquia-dev-123', destino: '/' },
  paroquia2: { login: 'paroquia-e2e-2', senha: 'paroquia-e2e-2-123', destino: '/' },
  conselho: { login: 'conselho-e2e', senha: 'conselho-e2e-123', destino: '/conselho' },
} as const;

export const CONSELHO_NOME = 'Conselheira E2E';

export async function login(page: Page, conta: keyof typeof CREDENCIAIS = 'paroquia') {
  const { login: usuario, senha, destino } = CREDENCIAIS[conta];
  await page.goto('/login');
  await page.getByLabel('Usuário').fill(usuario);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(destino);
}
