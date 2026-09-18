import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    apiClient: { login: vi.fn() },
  };
});

vi.mock('@/lib/auth-context', () => ({
  useSessao: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { apiClient, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import LoginPage from './page';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra erro de validação e não chama a API quando os campos estão vazios', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o usuário')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
    expect(apiClient.login).not.toHaveBeenCalled();
  });

  it('chama apiClient.login com os valores digitados e redireciona ao ter sucesso', async () => {
    (apiClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1',
      login: 'paroquia-dev',
      role: 'PAROQUIA',
      nome: null,
      paroquia: null,
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Usuário'), 'paroquia-dev');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(apiClient.login).toHaveBeenCalledWith('paroquia-dev', 'senha123');
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('mostra toast de erro quando a API responde 401', async () => {
    (apiClient.login as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError('Unauthorized', 401, { message: 'Unauthorized' }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Usuário'), 'paroquia-dev');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Login ou senha inválidos.');
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
