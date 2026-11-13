import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const logoutMutate = vi.fn();
const atuarMutate = vi.fn();
const setTheme = vi.fn();
const afilhada = { implantacaoId: 'i1', afilhada: { id: 'a1', nome: 'Paróquia Nova' } };
let sessao: Record<string, unknown>;

vi.mock('@/lib/auth-context', () => ({
  useSessao: () => ({ data: sessao }),
  useLogout: () => ({ mutate: logoutMutate, isPending: false }),
  useAtuar: () => ({ mutate: atuarMutate, isPending: false }),
}));

vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark', setTheme }) }));
vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return { ...actual, apiClient: { alterarSenha: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ContaMenu } from './conta-menu';

// Abre pelo teclado (foco + Enter): no jsdom o Radix só abre por clique no primeiro teste do
// arquivo — e o menu tem que funcionar sem mouse de qualquer jeito.
async function abrirMenu(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole('button', { name: 'Conta: Paróquia São José' }).focus();
  await user.keyboard('{Enter}');
  await screen.findByRole('menu');
}

describe('ContaMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessao = {
      id: 'u1',
      login: 'paroquia@gmail.com',
      role: 'PAROQUIA',
      nome: null,
      paroquia: { id: 'p1', nome: 'Paróquia São José' },
      atuando: null,
      podeAtuarEm: [],
    };
  });

  it('madrinha com afilhada em implantação: "Atuar como" chama a troca de sessão', async () => {
    sessao.podeAtuarEm = [afilhada];
    const user = userEvent.setup();
    render(<ContaMenu variante="cabecalho" />);

    await abrirMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Atuar como Paróquia Nova' }));

    expect(atuarMutate).toHaveBeenCalledWith('i1');
  });

  it('atuando: mostra "Voltar para…" e esconde "Trocar senha"', async () => {
    sessao.podeAtuarEm = [afilhada];
    sessao.atuando = afilhada;
    const user = userEvent.setup();
    render(<ContaMenu variante="cabecalho" />);

    await abrirMenu(user);

    expect(screen.queryByRole('menuitem', { name: 'Trocar senha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Atuar como/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Voltar para Paróquia São José' }));
    expect(atuarMutate).toHaveBeenCalledWith(null);
  });

  it('abre com trocar senha, tema (marcando o atual) e sair', async () => {
    const user = userEvent.setup();
    render(<ContaMenu variante="cabecalho" />);

    await abrirMenu(user);

    expect(screen.getByRole('menuitem', { name: 'Trocar senha' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Escuro' })).toBeChecked();
    await user.click(screen.getByRole('menuitemradio', { name: 'Claro' }));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('"Trocar senha" abre o dialog e "Sair" encerra a sessão', async () => {
    const user = userEvent.setup();
    render(<ContaMenu variante="cabecalho" />);

    await abrirMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Trocar senha' }));
    expect(await screen.findByLabelText('Senha atual')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await abrirMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));
    expect(logoutMutate).toHaveBeenCalled();
  });
});
