import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/hooks/use-fichas', () => ({ useHistoricoEquipes: vi.fn() }));
vi.mock('@/lib/hooks/use-fichas-casais', () => ({ useHistoricoEquipesCasal: vi.fn() }));

import { useHistoricoEquipes } from '@/lib/hooks/use-fichas';
import type { Ficha, HistoricoEquipeItem } from '@/lib/types';
import { PessoaPreviewPopover, resumirHistorico } from './pessoa-preview-popover';

function item(
  equipe: string,
  overrides: Partial<HistoricoEquipeItem> & { montagemStatus?: 'EM_ANDAMENTO' | 'FINALIZADA' } = {},
): HistoricoEquipeItem {
  const { montagemStatus = 'FINALIZADA', ...resto } = overrides;
  return {
    id: `${equipe}-${Math.random()}`,
    status: 'ACEITO',
    createdAt: '2026-01-01T00:00:00Z',
    vagaMontagem: {
      equipe: { nome: equipe } as HistoricoEquipeItem['vagaMontagem']['equipe'],
      cargo: {} as HistoricoEquipeItem['vagaMontagem']['cargo'],
      montagem: { numeroEncontro: 1, data: '2026-01-01', status: montagemStatus },
    },
    ...resto,
  };
}

describe('resumirHistorico', () => {
  it('conta só convites aceitos em encontros finalizados (mesmo critério da R2)', () => {
    const resumo = resumirHistorico([
      item('Cozinha'),
      item('Cozinha'),
      item('Sala'),
      item('Sala', { status: 'RECUSADO' }),
      item('Sala', { status: 'DESISTIU' }),
      item('Externa', { montagemStatus: 'EM_ANDAMENTO' }),
    ]);

    expect(resumo.vezesServidas).toBe(3);
    expect(resumo.porEquipe).toEqual([
      { nome: 'Cozinha', vezes: 2 },
      { nome: 'Sala', vezes: 1 },
    ]);
  });

  it('lista as equipes em que foi avaliado como apto a coordenar, sem repetir', () => {
    const resumo = resumirHistorico([
      item('Cozinha', { podeCoordenar: true }),
      item('Cozinha', { podeCoordenar: true }),
      item('Sala', { podeCoordenar: false, podePalestrar: true }),
    ]);

    expect(resumo.podeCoordenar).toEqual(['Cozinha']);
    expect(resumo.podePalestrar).toBe(true);
  });

  it('ignora avaliação de alocação que não conta como serviço', () => {
    const resumo = resumirHistorico([item('Cozinha', { status: 'RECUSADO', podeCoordenar: true })]);

    expect(resumo).toEqual({
      vezesServidas: 0,
      porEquipe: [],
      podeCoordenar: [],
      podePalestrar: false,
    });
  });
});

describe('PessoaPreviewPopover', () => {
  const ficha = {
    id: 'f1',
    nomeCompleto: 'Maria Souza',
    telefone: '88 99999-0000',
    corCirculo: null,
    numeroEncontro: 5,
    fotoUrl: null,
  } as unknown as Ficha;

  beforeEach(() => vi.clearAllMocks());

  it('só busca o histórico quando o popover é aberto', async () => {
    vi.mocked(useHistoricoEquipes).mockReturnValue({
      data: [item('Cozinha', { podeCoordenar: true })],
    } as ReturnType<typeof useHistoricoEquipes>);
    const user = userEvent.setup();
    render(<PessoaPreviewPopover ficha={ficha}>Maria Souza</PessoaPreviewPopover>);

    expect(useHistoricoEquipes).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Maria Souza' }));

    expect(useHistoricoEquipes).toHaveBeenCalledWith('f1');
    expect(await screen.findByText('Serviu 1 vez')).toBeInTheDocument();
    expect(screen.getByText('Pode coordenar: Cozinha')).toBeInTheDocument();
  });

  it('avisa quando a pessoa ainda não serviu', async () => {
    vi.mocked(useHistoricoEquipes).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useHistoricoEquipes
    >);
    const user = userEvent.setup();
    render(<PessoaPreviewPopover ficha={ficha}>Maria Souza</PessoaPreviewPopover>);

    await user.click(screen.getByRole('button', { name: 'Maria Souza' }));

    expect(await screen.findByText('Ainda não serviu em nenhum encontro.')).toBeInTheDocument();
  });
});
