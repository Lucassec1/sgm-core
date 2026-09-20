import { type Page, expect } from '@playwright/test';

// Credencial de dev — mesma do seed normal (server/prisma/seed.ts), recriada pelo seed E2E
// (server/prisma/seed-e2e.ts) no banco isolado de teste.
export const PAROQUIA_LOGIN_DEV = 'paroquia-dev';
export const PAROQUIA_SENHA_DEV = 'paroquia-dev-123';

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Usuário').fill(PAROQUIA_LOGIN_DEV);
  await page.getByLabel('Senha', { exact: true }).fill(PAROQUIA_SENHA_DEV);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');
}
