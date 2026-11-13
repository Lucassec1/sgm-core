import { test, expect } from '@playwright/test';
import { SERVER_PORT } from '../playwright.config';
import { CONSELHO_NOME, login } from './support/login';

const API = `http://localhost:${SERVER_PORT}`;

// Ciclo Conselho -> paróquia (R8) e os atalhos do Dashboard, ponta a ponta com as três contas do
// seed E2E. A montagem é criada pela API (o formulário já é coberto em montagem.spec.ts), numa
// paróquia própria pra não depender da ordem dos specs.
test.describe('Conselho e paróquia', () => {
  test('dashboard mostra o encontro, Conselho comenta, paróquia lê e outra paróquia não vê', async ({
    page,
    browser,
  }) => {
    await login(page, 'paroquia2');
    const resposta = await page.request.post(`${API}/montagens`, {
      data: { data: '2027-08-01', numeroJovensVivenciando: 45 },
    });
    expect(resposta.ok()).toBeTruthy();
    const { id } = await resposta.json();

    // Início: painel do encontro em andamento (#70)
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '1º Encontro' })).toBeVisible();
    await expect(page.getByText('Em andamento').first()).toBeVisible();

    // Sem observação, o card não aparece na montagem (#69)
    await page.goto(`/montagem/${id}`);
    await expect(page.getByRole('heading', { name: '1º Encontro' })).toBeVisible();
    await expect(page.getByText('Observações do Conselho')).toHaveCount(0);

    // Conselho deixa uma observação, com o nome vindo da conta (R8)
    const contextoConselho = await browser.newContext();
    const conselho = await contextoConselho.newPage();
    await login(conselho, 'conselho');
    await conselho.goto(`/conselho/montagem/${id}`);
    const texto = 'Rever a coordenação da Cozinha';
    await conselho.getByPlaceholder(/Deixar uma observação/).fill(texto);
    await conselho.getByRole('button', { name: 'Enviar observação' }).click();
    await expect(conselho.getByText('Observação registrada.')).toBeVisible();
    await contextoConselho.close();

    // A paróquia dona da montagem lê a observação
    await page.reload();
    await expect(page.getByText('Observações do Conselho')).toBeVisible();
    await expect(page.getByText(texto)).toBeVisible();
    await expect(page.getByText(CONSELHO_NOME, { exact: true })).toBeVisible();

    // Outra paróquia não enxerga nem que a montagem existe (R7)
    const contextoOutra = await browser.newContext();
    const outra = await contextoOutra.newPage();
    await login(outra, 'paroquia');
    const negada = await outra.request.get(`${API}/montagens/${id}/observacoes`);
    expect(negada.status()).toBe(404);
    await contextoOutra.close();
  });

  test('Conselho cadastra paróquia só com o e-mail e o primeiro acesso manda o link de criar senha', async ({
    page,
    browser,
  }) => {
    // nome/e-mail únicos por execução — o banco E2E é reaproveitado entre rodadas locais
    const sufixo = Date.now();
    const nome = `Paróquia Primeiro Acesso ${sufixo}`;
    const email = `paroquia-${sufixo}@e2e.test`;
    await login(page, 'conselho');
    await page.getByRole('button', { name: 'Nova paróquia' }).click();
    await page.getByLabel('Nome').fill(nome);
    await page.getByLabel('E-mail da paróquia').fill(email);
    await page.getByRole('button', { name: 'Cadastrar' }).click();

    const card = page.getByRole('group', { name: nome });
    await expect(card.getByText(email)).toBeVisible();
    await expect(card.getByText('Aguardando primeiro acesso')).toBeVisible();

    // A paróquia entra só com o e-mail: sem senha ainda, o sistema avisa que mandou o link
    const contexto = await browser.newContext();
    const paroquia = await contexto.newPage();
    await paroquia.goto('/login');
    await paroquia.getByLabel('E-mail').fill(email);
    await paroquia.getByRole('button', { name: 'Entrar' }).click();
    await expect(paroquia.getByRole('status')).toContainText('Primeiro acesso.');
    await expect(paroquia).toHaveURL(/\/login$/);
    await contexto.close();
  });
});
