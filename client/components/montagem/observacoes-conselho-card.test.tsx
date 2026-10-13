import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/hooks/use-montagens', () => ({ useObservacoesConselho: vi.fn() }));

import { useObservacoesConselho } from '@/lib/hooks/use-montagens';
import { ObservacoesConselhoCard } from './observacoes-conselho-card';

const mockHook = vi.mocked(useObservacoesConselho);

function comDados(data: unknown) {
  mockHook.mockReturnValue({ data } as ReturnType<typeof useObservacoesConselho>);
}

describe('ObservacoesConselhoCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não renderiza nada enquanto carrega', () => {
    comDados(undefined);
    const { container } = render(<ObservacoesConselhoCard montagemId="m1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza nada quando o Conselho ainda não deixou observação', () => {
    comDados([]);
    const { container } = render(<ObservacoesConselhoCard montagemId="m1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra texto e nome de quem escreveu (R8), na ordem que a API devolve', () => {
    comDados([
      {
        id: 'o2',
        texto: 'Rever coordenação da Cozinha',
        createdAt: '2026-10-12T20:00:00Z',
        usuario: { nome: 'Ana' },
      },
      {
        id: 'o1',
        texto: 'Montagem bem equilibrada',
        createdAt: '2026-10-11T20:00:00Z',
        usuario: { nome: null },
      },
    ]);
    render(<ObservacoesConselhoCard montagemId="m1" />);

    expect(screen.getByText('Observações do Conselho')).toBeInTheDocument();
    expect(
      screen.getByText('2 observações registradas pelo Conselho nesta montagem.'),
    ).toBeInTheDocument();
    const textos = screen
      .getAllByText(/Rever coordenação|Montagem bem equilibrada/)
      .map((e) => e.textContent);
    expect(textos).toEqual(['Rever coordenação da Cozinha', 'Montagem bem equilibrada']);
    expect(screen.getByText(/^Ana ·/)).toBeInTheDocument();
    expect(screen.getByText(/^Conselho ·/)).toBeInTheDocument();
  });

  it('busca as observações da montagem certa', () => {
    comDados([]);
    render(<ObservacoesConselhoCard montagemId="m42" />);
    expect(mockHook).toHaveBeenCalledWith('m42');
  });
});
