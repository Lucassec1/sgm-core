import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const logoutMutate = vi.fn();
const setTheme = vi.fn();

vi.mock('@/lib/auth-context', () => ({
  useSessao: () => ({
    data: {
      id: 'u1',
      login: 'paroquia@gmail.com',
      role: 'PAROQUIA',
      nome: null,
      paroquia: { id: 'p1', nome: 'Paróquia São José' },
    },
  }),
  useLogout: () => ({ mutate: logoutMutate, isPending: false }),
}));

vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark', setTheme }) }));
vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return { ...actual, apiClient: { alterarSenha: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ContaMenu } from './conta-menu';

describe('ContaMenu', () => {
  it('abre com trocar senha, tema (marcando o atual) e sair', async () => {
    const user = userEvent.setup();
    render(<ContaMenu variante="cabecalho" />);

    await user.click(screen.getByRole('button', { name: 'Conta: Paróquia São José' }));

    expect(screen.getByRole('menuitem', { name: 'Trocar senha' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Escuro' })).toBeChecked();
    await user.click(screen.getByRole('menuitemradio', { name: 'Claro' }));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('"Trocar senha" abre o dialog e "Sair" encerra a sessão', async () => {
    const user = userEvent.setup();
    render(<ContaMenu variante="cabecalho" />);

    // Abre pelo teclado (foco + Enter) — o menu tem que funcionar sem mouse.
    screen.getByRole('button', { name: 'Conta: Paróquia São José' }).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Trocar senha' }));
    expect(await screen.findByLabelText('Senha atual')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    screen.getByRole('button', { name: 'Conta: Paróquia São José' }).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Sair' }));
    expect(logoutMutate).toHaveBeenCalled();
  });
});
