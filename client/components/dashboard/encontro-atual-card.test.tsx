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
  it('com encontro em andamento, leva pra montagem e pro telão em outra aba', () => {
    render(<EncontroAtualCard emAndamento={montagem({ id: 'm7' })} />);

    expect(screen.getByText('12º Encontro em andamento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir montagem/ })).toHaveAttribute(
      'href',
      '/montagem/m7',
    );
    const telao = screen.getByRole('link', { name: /Modo telão/ });
    expect(telao).toHaveAttribute('href', '/montagem/m7/telao');
    expect(telao).toHaveAttribute('target', '_blank');
  });

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
    expect(screen.queryByRole('link', { name: /Modo telão/ })).not.toBeInTheDocument();
  });

  it('dá prioridade ao encontro em andamento quando há os dois', () => {
    render(
      <EncontroAtualCard
        emAndamento={montagem({ id: 'm7' })}
        ultimaFinalizada={montagem({ id: 'm6', status: 'FINALIZADA' })}
      />,
    );

    expect(screen.queryByText(/Último encontro/)).not.toBeInTheDocument();
  });

  it('sem nenhuma montagem, não renderiza nada', () => {
    const { container } = render(<EncontroAtualCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
