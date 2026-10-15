import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mutateAsync = vi.fn();
vi.mock('@/lib/hooks/use-montagens', () => ({
  useCandidatosJovens: vi.fn(() => ({ data: [] })),
  useCoordenadoresSugeridos: vi.fn(),
  useCreateAlocacao: () => ({ mutateAsync }),
  useDeleteAlocacao: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-fichas-casais', () => ({ useFichasCasais: () => ({ data: undefined }) }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { ApiError } from '@/lib/api-client';
import { useCandidatosJovens, useCoordenadoresSugeridos } from '@/lib/hooks/use-montagens';
import { AlocarPessoaCombobox } from './alocar-pessoa-combobox';

const ficha = (id: string, nome: string, avaliadoPodeCoordenar = false) => ({
  id,
  nomeCompleto: nome,
  avaliadoPodeCoordenar,
});

function renderizar(ehCoordenacao: boolean) {
  render(
    <AlocarPessoaCombobox
      montagemId="m1"
      vagaMontagemId="v1"
      equipeId="e1"
      ehCoordenacao={ehCoordenacao}
      tipoPessoa="JOVEM"
      label="Adicionar"
      idsJaAlocados={new Set()}
      todasVagas={[]}
      todasAlocacoes={[]}
    />,
  );
}

describe('AlocarPessoaCombobox', () => {
  // cmdk (Command) usa APIs que o jsdom não tem
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCoordenadoresSugeridos).mockReturnValue({
      data: {
        grupoA: {
          fichas: [ficha('a1', 'Ana Avaliada', true), ficha('a2', 'Bia Serviu')],
          fichasCasais: [],
        },
        grupoB: { fichas: [ficha('b1', 'Caio Dirigente')], fichasCasais: [] },
        outros: { fichas: [ficha('o1', 'Davi Novato')], fichasCasais: [] },
      },
    } as never);
  });

  it('coordenação: mostra os três grupos e marca quem foi avaliado e quem nunca serviu', async () => {
    const user = userEvent.setup();
    renderizar(true);
    await user.click(screen.getByRole('button', { name: /Adicionar/ }));

    expect(screen.getAllByRole('group')).toHaveLength(3);
    const serviram = screen.getByRole('group', { name: 'Já serviram nesta equipe' });
    // avaliado "pode coordenar" vem primeiro (ordem do server) e leva a marca
    expect(within(serviram).getAllByRole('option')[0]).toHaveTextContent(
      'Ana AvaliadaAvaliado(a): pode coordenar esta equipe',
    );
    expect(
      within(
        screen.getByRole('group', { name: 'Já foram Equipe Dirigente / Comando Geral' }),
      ).getByText('Caio Dirigente'),
    ).toBeInTheDocument();
    const outros = screen.getByRole('group', { name: 'Outras pessoas' });
    expect(within(outros).getByText('Nunca serviu nesta equipe')).toBeInTheDocument();
  });

  it('quando o server avisa (409), pede confirmação e reenvia com confirmarAvisos', async () => {
    mutateAsync
      .mockRejectedValueOnce(
        new ApiError('aviso', 409, {
          code: 'AVISOS_REGRAS',
          avisos: [
            {
              regra: 'R3',
              nivel: 'grave',
              mensagem:
                'Nunca serviu como equipista em Eq. da Animação nem foi Equipe Dirigente/Comando Geral.',
            },
          ],
        }),
      )
      .mockResolvedValueOnce({ id: 'nova' });
    const user = userEvent.setup();
    renderizar(true);
    await user.click(screen.getByRole('button', { name: /Adicionar/ }));
    await user.click(screen.getByText('Davi Novato'));

    expect(await screen.findByText('Isso foge das regras do Segue-me')).toBeInTheDocument();
    expect(screen.getByText(/Nunca serviu como equipista em Eq. da Animação/)).toBeInTheDocument();
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ confirmarAvisos: true }),
    );

    await user.click(screen.getByRole('button', { name: 'Alocar mesmo assim' }));

    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ fichaId: 'o1', confirmarAvisos: true }),
    );
  });

  it('vaga comum: marca quem recusou o convite deste encontro', async () => {
    vi.mocked(useCandidatosJovens).mockReturnValue({
      data: [
        { id: 'j1', nomeCompleto: 'Eva Disponível', recusouNesteEncontro: false },
        { id: 'j2', nomeCompleto: 'Fábio Recusou', recusouNesteEncontro: true },
      ],
    } as never);
    const user = userEvent.setup();
    renderizar(false);
    await user.click(screen.getByRole('button', { name: /Adicionar/ }));

    const recusou = screen.getByText('Fábio Recusou').closest('[cmdk-item]') as HTMLElement;
    expect(within(recusou).getByText('Recusou o convite deste encontro')).toBeInTheDocument();
    const disponivel = screen.getByText('Eva Disponível').closest('[cmdk-item]') as HTMLElement;
    expect(within(disponivel).queryByText('Recusou o convite deste encontro')).toBeNull();
  });
});
