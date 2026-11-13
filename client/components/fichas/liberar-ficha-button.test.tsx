import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const liberar = vi.fn().mockResolvedValue({});
const remover = vi.fn().mockResolvedValue({});
let liberacoes: { id: string; fichaId: string | null; fichaCasalId: string | null }[] = [];

vi.mock('@/lib/hooks/use-implantacoes', () => ({
  useMinhasImplantacoes: () => ({
    data: [
      { id: 'i1', fase: 'ACOMPANHAMENTO', afilhada: { id: 'a1', nome: 'Paróquia Nova' } },
      { id: 'i2', fase: 'SEMENTEIRA', afilhada: { id: 'a2', nome: 'Paróquia Outra' } },
    ],
  }),
  useLiberacoes: () => ({ data: liberacoes }),
  useLiberarFicha: () => ({ mutateAsync: liberar, isPending: false }),
  useRemoverLiberacao: () => ({ mutateAsync: remover, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LiberarFichaButton } from './liberar-ficha-button';

describe('LiberarFichaButton', () => {
  it('só aparece pros vínculos em acompanhamento e libera a ficha', async () => {
    liberacoes = [];
    const user = userEvent.setup();
    render(<LiberarFichaButton fichaId="f1" />);

    expect(screen.queryByRole('button', { name: /Paróquia Outra/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Liberar para Paróquia Nova' }));
    expect(liberar).toHaveBeenCalledWith({ fichaId: 'f1' });
  });

  it('já liberada: oferece desfazer', async () => {
    liberacoes = [{ id: 'l1', fichaId: 'f1', fichaCasalId: null }];
    const user = userEvent.setup();
    render(<LiberarFichaButton fichaId="f1" />);

    await user.click(screen.getByRole('button', { name: 'Desfazer liberação para Paróquia Nova' }));
    expect(remover).toHaveBeenCalledWith('l1');
  });
});
