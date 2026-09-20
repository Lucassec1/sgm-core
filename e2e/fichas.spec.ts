import { test, expect } from '@playwright/test';
import { login } from './support/login';

// Fluxo de Cadastro de Ficha (docs/ux-e-fluxos.md, 1.1): Dashboard → Lista de Fichas →
// Nova Ficha → preencher → salva → aparece na Lista de Fichas.
test.describe('Fluxo de Cadastro de Ficha', () => {
  test('cria uma ficha nova e ela aparece na lista', async ({ page }) => {
    await login(page);

    await page.goto('/fichas');
    await page.getByRole('link', { name: 'Nova Ficha' }).click();
    await expect(page).toHaveURL('/fichas/novo');

    const nome = `Teste E2E ${Date.now()}`;
    await page.getByLabel('Nome completo').fill(nome);

    // Sexo é o 1º Select do formulário, Cor do círculo o 2º (ver ficha-form.tsx).
    await page.getByRole('combobox').nth(0).click();
    await page.getByRole('option', { name: 'Rapaz' }).click();

    await page.locator('#dataNascimento').fill('2005-01-01');
    await page.getByLabel('Telefone', { exact: true }).fill('88999998888');
    await page.getByLabel('Nº do encontro').fill('1');

    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'Vermelho' }).click();

    await page.getByRole('button', { name: 'Criar ficha' }).click();

    // Redireciona pra página de detalhe (proposta #4 do fluxo) com o nome no header.
    await expect(page).toHaveURL(/\/fichas\/[a-f0-9-]+$/);
    await expect(page.getByRole('heading', { name: nome })).toBeVisible();

    await page.goto('/fichas');
    await expect(page.getByRole('link', { name: nome })).toBeVisible();
  });
});
