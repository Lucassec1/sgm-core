import { test, expect } from '@playwright/test';
import { login } from './support/login';

// Fluxo de Criação da Montagem (docs/ux-e-fluxos.md, 1.2), até o Quadro das 16 Equipes —
// o próximo passo do fluxo (convidar Círculos, etc.) já é operação dentro de uma montagem
// existente, coberta pelos testes unitários do módulo (server/src/modules/montagem/*.spec.ts).
test.describe('Fluxo de Montagem', () => {
  test('cria uma montagem e abre o quadro das 16 equipes', async ({ page }) => {
    await login(page);

    await page.goto('/montagem');
    await page.getByRole('button', { name: 'Nova Montagem' }).click();

    await page.locator('#data').fill('2027-06-01');
    // R6: 40 a 60 jovens vivenciando fora de implantação (ver nova-montagem-dialog.tsx).
    await page.locator('#numeroJovensVivenciando').fill('45');
    await page.locator('#padroeiro').fill('Nossa Senhora Aparecida');

    await page.getByRole('button', { name: 'Criar montagem' }).click();

    // Banco de teste começa zerado (seed-e2e.ts) — primeira montagem da paróquia é sempre nº 1.
    await expect(page).toHaveURL(/\/montagem\/[a-f0-9-]+$/);
    await expect(page.getByRole('heading', { name: '1º Encontro' })).toBeVisible();

    // Aba "Quadro de Equipes" é a default — as 16 equipes do catálogo (seed-equipes.ts)
    // aparecem como cards, incluindo a Eq. dos Círculos (1ª a ser convidada, R4).
    const quadroDeEquipes = page.getByRole('tabpanel');
    await expect(quadroDeEquipes.getByText('Comando Geral')).toBeVisible();
    await expect(quadroDeEquipes.getByText('Equipe dos Círculos')).toBeVisible();
    await expect(quadroDeEquipes.getByRole('button')).toHaveCount(16);
  });
});
