import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/use-fichas', () => ({ useHistoricoEquipes: vi.fn() }));
vi.mock('@/lib/hooks/use-fichas-casais', () => ({ useHistoricoEquipesCasal: vi.fn() }));

import { HistoricoEquipesLista } from './historico-equipes-section';

const item = (id: string, outraParoquia: boolean) => ({
  id,
  status: 'ACEITO' as const,
  createdAt: '2027-01-01T00:00:00Z',
  outraParoquia,
  vagaMontagem: {
    equipe: { id: 'e', nome: 'Equipe da Cozinha', slug: 'cozinha' },
    cargo: { id: 'c', nome: 'Componentes' },
    montagem: {
      numeroEncontro: 1,
      data: '2027-01-10T00:00:00Z',
      status: 'FINALIZADA' as const,
      paroquia: { nome: 'Paróquia Nova' },
    },
  },
});

describe('HistoricoEquipesLista', () => {
  it('serviço em outra paróquia (implantação) mostra o nome dela; o da própria, não', () => {
    render(
      <HistoricoEquipesLista
        isLoading={false}
        historico={[item('a1', true), item('a2', false)] as never}
      />,
    );
    expect(screen.getAllByText('Paróquia Nova')).toHaveLength(1);
  });
});
