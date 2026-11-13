import { test, expect, type Page } from '@playwright/test';
import { SERVER_PORT } from '../playwright.config';
import { login } from './support/login';

const API = `http://localhost:${SERVER_PORT}`;
const AFILHADA = 'Paróquia E2E Afilhada';

async function criarFicha(page: Page, nomeCompleto: string) {
  const resposta = await page.request.post(`${API}/fichas`, {
    data: {
      nomeCompleto,
      sexo: 'MOCA',
      dataNascimento: '2008-03-10',
      telefone: '88999990000',
      numeroEncontro: 16,
      corCirculo: 'AZUL',
    },
  });
  expect(resposta.ok()).toBeTruthy();
  return (await resposta.json()).id as string;
}

// Implantação ponta a ponta (docs/implantacao.md): Conselho cria o vínculo na sementeira, a
// madrinha marca a ficha, o Conselho inicia a implantação (a ficha passa pra afilhada), a
// madrinha atua pela afilhada e monta o I encontro pelo Anexo I com uma ficha de cada paróquia.
test('implantação: sementeira, transferência, atuação e encontro pelo anexo', async ({
  page,
  browser,
}) => {
  // 1. Conselho cria a implantação (afilhada nasce sem conta)
  const contextoConselho = await browser.newContext();
  const conselho = await contextoConselho.newPage();
  await login(conselho, 'conselho');
  await conselho.goto('/conselho/implantacoes');
  await conselho.getByRole('button', { name: 'Nova implantação' }).click();
  await conselho.getByLabel('Paróquia afilhada').fill(AFILHADA);
  await conselho.getByLabel('Paróquia madrinha').click();
  await conselho.getByRole('option', { name: 'Paróquia E2E', exact: true }).click();
  await conselho.getByRole('button', { name: 'Criar implantação' }).click();
  const card = conselho.getByRole('article', { name: AFILHADA }).first();
  await expect(card.getByText('Sementeira', { exact: true })).toBeVisible();

  // 2. Madrinha marca uma ficha como sementeira; outra ficha dela fica sem marca
  await login(page, 'paroquia');
  const fichaSementeira = await criarFicha(page, 'Ana Sementeira E2E');
  const fichaMadrinha = await criarFicha(page, 'Bia Madrinha E2E');
  await page.goto(`/fichas/${fichaSementeira}`);
  await page.getByLabel('Sementeira de').click();
  await page.getByRole('option', { name: AFILHADA }).click();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Ficha atualizada.')).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Sementeira de ${AFILHADA}`)).toBeVisible();

  // 3. Conselho inicia a implantação: a contagem aparece e a ficha passa pra afilhada
  await conselho.reload();
  await card.getByRole('button', { name: 'Iniciar implantação' }).click();
  await expect(
    conselho.getByText(new RegExp(`1 ficha de sementeira passa para ${AFILHADA}`)),
  ).toBeVisible();
  await conselho.getByRole('button', { name: 'Confirmar' }).click();
  await expect(card.getByText('Implantação', { exact: true })).toBeVisible();
  await contextoConselho.close();

  // 4. Madrinha atua como afilhada
  await page.goto('/');
  await page.getByRole('button', { name: 'Conta: Paróquia E2E' }).click();
  await page.getByRole('menuitem', { name: `Atuar como ${AFILHADA}` }).click();
  await expect(page.getByText(`Atuando como ${AFILHADA}`)).toBeVisible();

  // 5. O I encontro da afilhada nasce com as vagas do Anexo I
  const criada = await page.request.post(`${API}/montagens`, {
    data: { data: '2027-09-10', numeroJovensVivenciando: 50 },
  });
  expect(criada.ok()).toBeTruthy();
  const montagem = await criada.json();
  type Vaga = {
    id: string;
    origem: string | null;
    quantidadeCasais: number;
    equipe: { slug: string };
    cargo: { nome: string };
  };
  const vagas = montagem.vagas as Vaga[];
  const visitacao = vagas
    .filter((v) => v.equipe.slug === 'visitacao')
    .reduce((s, v) => s + v.quantidadeCasais, 0);
  expect(visitacao).toBe(21);
  await page.goto(`/montagem/${montagem.id}`);
  await expect(page.getByText('Implantação: encontro 1 de 3')).toBeVisible();

  // 6. Uma ficha de cada paróquia na montagem da afilhada (exceção da R7 na implantação)
  const vagaDe = (origem: string) =>
    vagas.find(
      (v) => v.equipe.slug === 'animacao' && v.cargo.nome === 'Componentes' && v.origem === origem,
    )!;
  for (const [fichaId, origem] of [
    [fichaSementeira, 'AFILHADA'],
    [fichaMadrinha, 'MADRINHA'],
  ]) {
    const alocada = await page.request.post(`${API}/montagens/${montagem.id}/alocacoes`, {
      data: { vagaMontagemId: vagaDe(origem).id, tipoPessoa: 'JOVEM', fichaId },
    });
    expect(alocada.ok()).toBeTruthy();
  }

  // 7. Volta pra própria paróquia
  await page.getByRole('button', { name: 'Voltar para a minha paróquia' }).click();
  await expect(page.getByText(`Atuando como ${AFILHADA}`)).toHaveCount(0);
});
