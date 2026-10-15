import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mutateAsync = vi.fn();
vi.mock('@/lib/hooks/use-montagens', () => ({
  useCandidatosJovens: vi.fn(() => ({ data: [] })),
  useCandidatosCasais: vi.fn(() => ({ data: [] })),
  useCoordenadoresSugeridos: vi.fn(),
  useCreateAlocacao: () => ({ mutateAsync }),
  useDeleteAlocacao: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { ApiError } from '@/lib/api-client';
import {
  useCandidatosCasais,
  useCandidatosJovens,
  useCoordenadoresSugeridos,
} from '@/lib/hooks/use-montagens';
import type { Alocacao } from '@/lib/types';
import { AlocarPessoaCombobox } from './alocar-pessoa-combobox';

const ficha = (id: string, nome: string, avaliadoPodeCoordenar = false, vezesNaEquipe = 0) => ({
  id,
  nomeCompleto: nome,
  avaliadoPodeCoordenar,
  vezesNaEquipe,
});

function renderizar(
  props: Partial<{
    ehCoordenacao: boolean;
    tipoPessoa: 'JOVEM' | 'CASAL';
    todasAlocacoes: Alocacao[];
  }> = {},
) {
  render(
    <AlocarPessoaCombobox
      montagemId="m1"
      vagaMontagemId="v1"
      equipeId="e1"
      ehCoordenacao={props.ehCoordenacao ?? false}
      tipoPessoa={props.tipoPessoa ?? 'JOVEM'}
      label="Adicionar"
      idsJaAlocados={new Set()}
      todasVagas={[]}
      todasAlocacoes={props.todasAlocacoes ?? []}
    />,
  );
}

async function abrir(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Adicionar/ }));
}

const opcao = (nome: string) => screen.getByText(nome).closest('[cmdk-item]') as HTMLElement;

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
          fichas: [ficha('a1', 'Ana Avaliada', true, 1), ficha('a2', 'Bia Veterana', false, 3)],
          fichasCasais: [],
        },
        grupoB: { fichas: [ficha('b1', 'Caio Dirigente')], fichasCasais: [] },
        outros: { fichas: [ficha('o1', 'Davi Novato')], fichasCasais: [] },
      },
    } as never);
    mutateAsync.mockResolvedValue({ id: 'nova' });
  });

  it('coordenação: três grupos, com badges de avaliação, repetição e "nunca serviu"', async () => {
    const user = userEvent.setup();
    renderizar({ ehCoordenacao: true });
    await abrir(user);

    expect(screen.getAllByRole('group')).toHaveLength(3);
    const serviram = screen.getByRole('group', { name: 'Já serviram nesta equipe' });
    expect(within(serviram).getAllByRole('option')[0]).toHaveTextContent('Ana Avaliada');
    expect(within(opcao('Ana Avaliada')).getByText('Pode coordenar')).toBeInTheDocument();
    expect(within(opcao('Ana Avaliada')).getByText('2ª vez nesta equipe')).toBeInTheDocument();
    expect(within(opcao('Bia Veterana')).getByText('4ª vez nesta equipe')).toBeInTheDocument();
    const outros = screen.getByRole('group', { name: 'Outras pessoas' });
    expect(within(outros).getByText('Nunca serviu nesta equipe')).toBeInTheDocument();
  });

  it('escolher quem foge da regra aloca direto, sem confirmação (R1–R3 só informam)', async () => {
    const user = userEvent.setup();
    renderizar({ ehCoordenacao: true });
    await abrir(user);
    await user.click(screen.getByText('Davi Novato'));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ fichaId: 'o1' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('vaga comum de jovem: badges de recusa e de repetição', async () => {
    vi.mocked(useCandidatosJovens).mockReturnValue({
      data: [
        { id: 'j1', nomeCompleto: 'Eva Disponível', recusouNesteEncontro: false, vezesNaEquipe: 0 },
        { id: 'j2', nomeCompleto: 'Fábio Recusou', recusouNesteEncontro: true, vezesNaEquipe: 2 },
      ],
    } as never);
    const user = userEvent.setup();
    renderizar();
    await abrir(user);

    expect(within(opcao('Fábio Recusou')).getByText('Recusou este encontro')).toBeInTheDocument();
    expect(within(opcao('Fábio Recusou')).getByText('3ª vez nesta equipe')).toBeInTheDocument();
    expect(within(opcao('Eva Disponível')).queryByText(/Recusou|vez nesta equipe/)).toBeNull();
  });

  it('vaga de casal: usa os candidatos casais da vaga, com repetição (ex.: Visitação)', async () => {
    vi.mocked(useCandidatosCasais).mockReturnValue({
      data: [
        {
          id: 'c1',
          nomeEle: 'José',
          nomeEla: 'Ana',
          recusouNesteEncontro: false,
          vezesNaEquipe: 4,
        },
      ],
    } as never);
    const user = userEvent.setup();
    renderizar({ tipoPessoa: 'CASAL' });
    await abrir(user);

    expect(useCandidatosCasais).toHaveBeenCalledWith('m1', 'v1');
    expect(within(opcao('José e Ana')).getByText('5ª vez nesta equipe')).toBeInTheDocument();
  });

  it('R4 ainda confirma: mover alguém já convidado antes dos Círculos fecharem', async () => {
    mutateAsync
      .mockRejectedValueOnce(
        new ApiError('aviso', 409, {
          code: 'AVISOS_REGRAS',
          avisos: [
            {
              regra: 'R4',
              nivel: 'atencao',
              rotulo: 'Círculos em aberto',
              mensagem: 'A Eq. dos Círculos ainda não fechou (nem todos aceitaram).',
            },
          ],
        }),
      )
      .mockResolvedValueOnce({ id: 'nova' });
    vi.mocked(useCandidatosJovens).mockReturnValue({
      data: [
        { id: 'j1', nomeCompleto: 'Eva Convidada', recusouNesteEncontro: false, vezesNaEquipe: 0 },
      ],
    } as never);
    const user = userEvent.setup();
    renderizar({
      todasAlocacoes: [
        { id: 'antiga', vagaMontagemId: 'outra', fichaId: 'j1', status: 'CONVIDADO' } as Alocacao,
      ],
    });
    await abrir(user);
    await user.click(screen.getByText('Eva Convidada'));
    await user.click(await screen.findByRole('button', { name: 'Mover' }));

    expect(await screen.findByText(/Eq. dos Círculos ainda não fechou/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Alocar mesmo assim' }));

    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ fichaId: 'j1', status: 'CONVIDADO', confirmarAvisos: true }),
    );
  });
});
