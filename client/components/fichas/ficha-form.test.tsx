import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Ficha } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { FichaForm } from './ficha-form';

// Caracterização do formulário (fase 2): fixa o comportamento visível de hoje — o que trava ao
// editar e a validação ao enviar — pra divisão em seções não mudar nada sem ninguém perceber.
const fichaFake: Ficha = {
  id: 'f1',
  paroquiaId: 'p1',
  nomeCompleto: 'Maria das Dores',
  sexo: 'MOCA',
  dataNascimento: '2008-03-10T00:00:00.000Z',
  telefone: '88999990000',
  participaOutroMovimento: false,
  sacramentoBatismo: true,
  sacramentoEucaristia: true,
  sacramentoCrisma: false,
  numeroEncontro: 3,
  corCirculo: 'AZUL',
  situacao: 'ATIVA',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as Ficha;

function renderForm(ficha?: Ficha) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FichaForm ficha={ficha} />
    </QueryClientProvider>,
  );
}

const CAMPOS_TRAVADOS_NA_EDICAO = ['Naturalidade', 'Nº do encontro', 'Nome do pai'];

describe('FichaForm', () => {
  // Checkbox/Select (Radix) medem o elemento com ResizeObserver, que o jsdom não tem — mesmo
  // stub do alocar-pessoa-combobox.test.tsx.
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it('ao editar, esconde o nome (vai no header da página) e trava identificação e filiação', () => {
    renderForm(fichaFake);
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
    for (const label of CAMPOS_TRAVADOS_NA_EDICAO) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
  });

  it('ao criar, mostra o nome e deixa os mesmos campos editáveis', () => {
    renderForm();
    for (const label of ['Nome completo', ...CAMPOS_TRAVADOS_NA_EDICAO]) {
      expect(screen.getByLabelText(label)).not.toBeDisabled();
    }
  });

  it('mostra erro de validação ao enviar vazio', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Criar ficha' }));

    expect(await screen.findByText('Informe o nome completo')).toBeInTheDocument();
  });
});
