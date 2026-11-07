import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Alocacao, ListaSubstituicaoItem } from '@/lib/types';

const ficha = (id: string, nomeCompleto: string, numeroEncontro = 3) => ({
  id,
  nomeCompleto,
  numeroEncontro,
  corCirculo: 'AZUL',
});
const casal = (id: string, nomeEle: string, nomeEla: string) => ({ id, nomeEle, nomeEla });

vi.mock('@/lib/hooks/use-montagens', () => ({
  useCandidatosJovensGeral: () => ({
    data: [
      ficha('j-livre', 'Ana Livre'),
      ficha('j-vaga', 'Bruno Na Vaga'),
      ficha('j-saiu', 'Carla Desistiu'),
      ficha('j-lista', 'Davi Na Lista'),
      ficha('j-subst', 'Elisa Substituida'),
    ],
    isLoading: false,
  }),
  useCandidatosCasaisGeral: () => ({
    data: [casal('c-livre', 'Felipe', 'Gabi'), casal('c-vaga', 'Hugo', 'Iara')],
    isLoading: false,
  }),
  useCreateListaSubstituicaoItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ForaDaMontagemSection } from './fora-da-montagem-section';

const aloc = (status: string, campo: Partial<Alocacao>) => ({ status, ...campo }) as Alocacao;

function renderSecao() {
  return render(
    <ForaDaMontagemSection
      montagemId="m1"
      alocacoes={[
        aloc('ACEITO', { fichaId: 'j-vaga' }),
        aloc('DESISTIU', { fichaId: 'j-saiu' }),
        aloc('SUBSTITUIDO', { fichaId: 'j-subst' }),
        aloc('CONVIDADO', { fichaCasalId: 'c-vaga' }),
      ]}
      lista={[{ fichaId: 'j-lista' } as ListaSubstituicaoItem]}
    />,
  );
}

describe('ForaDaMontagemSection', () => {
  it('mostra só quem não está em vaga, na lista de substituição nem entre os que desistiram', () => {
    renderSecao();

    expect(screen.getByText('Ana Livre')).toBeInTheDocument();
    expect(screen.getByText(/Felipe e Gabi/)).toBeInTheDocument();
    // quem foi substituído saiu da vaga e volta a ficar disponível
    expect(screen.getByText('Elisa Substituida')).toBeInTheDocument();

    expect(screen.queryByText('Bruno Na Vaga')).not.toBeInTheDocument();
    expect(screen.queryByText('Carla Desistiu')).not.toBeInTheDocument();
    expect(screen.queryByText('Davi Na Lista')).not.toBeInTheDocument();
    expect(screen.queryByText(/Hugo e Iara/)).not.toBeInTheDocument();
    expect(screen.getByText('3 nomes')).toBeInTheDocument();
  });

  it('filtra por tipo e por nome', async () => {
    const user = userEvent.setup();
    renderSecao();

    await user.click(screen.getByRole('button', { name: 'Casais' }));
    expect(screen.queryByText('Ana Livre')).not.toBeInTheDocument();
    expect(screen.getByText(/Felipe e Gabi/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.type(screen.getByLabelText('Buscar nos nomes que não estão na montagem'), 'elisa');
    expect(screen.getByText('Elisa Substituida')).toBeInTheDocument();
    expect(screen.queryByText('Ana Livre')).not.toBeInTheDocument();
  });
});
