import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const atuarMutate = vi.fn();
let sessao: Record<string, unknown> | undefined;

vi.mock('@/lib/auth-context', () => ({
  useSessao: () => ({ data: sessao }),
  useAtuar: () => ({ mutate: atuarMutate, isPending: false }),
}));

import { AtuandoBanner } from './atuando-banner';

describe('AtuandoBanner', () => {
  it('não aparece fora da atuação', () => {
    sessao = { atuando: null };
    const { container } = render(<AtuandoBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('atuando: diz por qual paróquia e volta pra própria', async () => {
    sessao = { atuando: { implantacaoId: 'i1', afilhada: { id: 'a1', nome: 'Paróquia Nova' } } };
    const user = userEvent.setup();
    render(<AtuandoBanner />);

    expect(screen.getByText('Atuando como Paróquia Nova')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para a minha paróquia' }));
    expect(atuarMutate).toHaveBeenCalledWith(null);
  });
});
