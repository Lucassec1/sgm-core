import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Montagem } from '@/lib/types';
import { EncontroAtualCard } from './encontro-atual-card';

function montagem(overrides: Partial<Montagem>): Montagem {
  return {
    id: 'm1',
    numeroEncontro: 12,
    data: '2026-11-20T00:00:00Z',
    status: 'EM_ANDAMENTO',
    ...overrides,
  } as Montagem;
}

describe('EncontroAtualCard', () => {
  it('sem encontro em andamento, leva pro resumo do último finalizado', () => {
    render(
      <EncontroAtualCard
        ultimaFinalizada={montagem({ id: 'm6', numeroEncontro: 11, status: 'FINALIZADA' })}
      />,
    );

    expect(screen.getByText('Último encontro: 11º (finalizado)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver resumo/ })).toHaveAttribute(
      'href',
      '/montagem/m6',
    );
  });

  it('sem nenhuma montagem, não renderiza nada', () => {
    const { container } = render(<EncontroAtualCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
