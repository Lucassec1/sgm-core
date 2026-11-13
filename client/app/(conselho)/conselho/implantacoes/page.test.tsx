import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const avancar = vi.fn().mockResolvedValue({});
let implantacoes: Record<string, unknown>[] = [];

vi.mock('@/lib/hooks/use-implantacoes', () => ({
  useImplantacoes: () => ({ data: implantacoes, isLoading: false, isError: false }),
  useAvancarImplantacao: () => ({ mutateAsync: avancar, isPending: false }),
  useLiberarAcessoAfilhada: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCriarImplantacao: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/lib/hooks/use-conselho', () => ({ useParoquias: () => ({ data: [] }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ImplantacoesPage from './page';

const base = {
  madrinha: { id: 'm', nome: 'Paróquia Madrinha' },
  afilhada: { id: 'a', nome: 'Paróquia Afilhada' },
  createdAt: '2026-11-01T12:00:00Z',
  implantacaoIniciadaEm: null,
  acompanhamentoIniciadoEm: null,
  encerradaEm: null,
};

describe('Conselho → Implantações', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra a fase e a ação da fase seguinte de cada vínculo', () => {
    implantacoes = [
      { ...base, id: 'i1', fase: 'SEMENTEIRA', afilhadaTemConta: false, fichasSementeira: 24 },
      { ...base, id: 'i2', fase: 'IMPLANTACAO', afilhadaTemConta: false, fichasSementeira: 0 },
      { ...base, id: 'i3', fase: 'ACOMPANHAMENTO', afilhadaTemConta: true, fichasSementeira: 0 },
      { ...base, id: 'i4', fase: 'ENCERRADA', afilhadaTemConta: true, fichasSementeira: 0 },
    ];
    render(<ImplantacoesPage />);
    const [i1, i2, i3, i4] = screen.getAllByRole('article');

    expect(within(i1).getByText('Sementeira')).toBeInTheDocument();
    expect(within(i1).getByRole('button', { name: 'Iniciar implantação' })).toBeInTheDocument();
    expect(within(i1).queryByRole('button', { name: 'Liberar acesso' })).not.toBeInTheDocument();
    expect(
      within(i2).getByRole('button', { name: 'Passar para acompanhamento' }),
    ).toBeInTheDocument();
    expect(within(i2).getByRole('button', { name: 'Liberar acesso' })).toBeInTheDocument();
    expect(within(i3).getByRole('button', { name: 'Encerrar' })).toBeInTheDocument();
    expect(within(i3).queryByRole('button', { name: 'Liberar acesso' })).not.toBeInTheDocument();
    expect(within(i4).queryByRole('button')).not.toBeInTheDocument();
  });

  it('iniciar a implantação confirma mostrando quantas fichas passam pra afilhada', async () => {
    implantacoes = [
      { ...base, id: 'i1', fase: 'SEMENTEIRA', afilhadaTemConta: false, fichasSementeira: 24 },
    ];
    const user = userEvent.setup();
    render(<ImplantacoesPage />);

    await user.click(screen.getByRole('button', { name: 'Iniciar implantação' }));
    expect(
      await screen.findByText(/24 fichas de sementeira passam para Paróquia Afilhada/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(avancar).toHaveBeenCalledWith({ id: 'i1', acao: 'iniciar' });
  });
});
