import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    apiClient: { alterarSenha: vi.fn() },
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { apiClient, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { TrocarSenhaDialog } from './trocar-senha-dialog';

async function abrirDialog(user: ReturnType<typeof userEvent.setup>) {
  render(<TrocarSenhaDialog />);
  await user.click(screen.getByRole('button', { name: 'Trocar senha' }));
}

describe('TrocarSenhaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia o envio e não chama a API quando nova senha e confirmação não coincidem', async () => {
    const user = userEvent.setup();
    await abrirDialog(user);

    await user.type(screen.getByLabelText('Senha atual'), 'atual123');
    await user.type(screen.getByLabelText('Nova senha'), 'novaSenha1');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'outraSenha');
    await user.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
    expect(apiClient.alterarSenha).not.toHaveBeenCalled();
  });

  it('chama apiClient.alterarSenha e fecha o dialog ao ter sucesso', async () => {
    (apiClient.alterarSenha as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const user = userEvent.setup();
    await abrirDialog(user);

    await user.type(screen.getByLabelText('Senha atual'), 'atual123');
    await user.type(screen.getByLabelText('Nova senha'), 'novaSenha1');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenha1');
    await user.click(screen.getByRole('button', { name: 'Trocar senha' }));

    await waitFor(() => {
      expect(apiClient.alterarSenha).toHaveBeenCalledWith('atual123', 'novaSenha1');
    });
    await waitFor(() => {
      expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith('Senha alterada.');
  });

  it('mostra toast de erro quando a senha atual está incorreta (401)', async () => {
    (apiClient.alterarSenha as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError('Unauthorized', 401, { message: 'Unauthorized' }),
    );

    const user = userEvent.setup();
    await abrirDialog(user);

    await user.type(screen.getByLabelText('Senha atual'), 'errada');
    await user.type(screen.getByLabelText('Nova senha'), 'novaSenha1');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenha1');
    await user.click(screen.getByRole('button', { name: 'Trocar senha' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Senha atual incorreta.');
    });
    expect(screen.getByLabelText('Senha atual')).toBeInTheDocument();
  });
});
