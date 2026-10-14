import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    apiClient: {
      listFichas: vi.fn(),
      listFichasCasais: vi.fn(),
      uploadFotoFicha: vi.fn(),
      uploadFotoFichaCasal: vi.fn(),
    },
  };
});

import { apiClient, ApiError } from '@/lib/api-client';
import { UploadFotosLoteDialog } from './upload-fotos-lote-dialog';

const fichas = [
  { id: 'maria', nomeCompleto: 'Maria Aparecida de Souza', fotoUrl: null },
  { id: 'joao', nomeCompleto: 'João Pedro Lima', fotoUrl: '/fichas/joao/foto' },
];

function arquivo(nome: string, tipo = 'image/jpeg') {
  return new File(['x'], nome, { type: tipo });
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UploadFotosLoteDialog tipo="jovem" />
    </QueryClientProvider>,
  );
}

async function abrirEEscolher(user: ReturnType<typeof userEvent.setup>, arquivos: File[]) {
  renderizar();
  await user.click(screen.getByRole('button', { name: /Fotos em lote/ }));
  await screen.findByRole('button', { name: /Escolher fotos/ });
  // applyAccept: false — o input aceita só imagem; o teste também cobre um PDF sendo recusado
  await userEvent
    .setup({ applyAccept: false })
    .upload(screen.getByTestId('input-arquivos'), arquivos);
}

describe('UploadFotosLoteDialog', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn((f: Blob) => `blob:${(f as File).name}`);
    URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.listFichas).mockResolvedValue({
      items: fichas,
      total: 2,
      page: 1,
      pageSize: 100,
    } as never);
    vi.mocked(apiClient.uploadFotoFicha).mockResolvedValue({} as never);
  });

  it('sugere a ficha de cada foto, recusa arquivo inválido e envia só o que tem ficha', async () => {
    const user = userEvent.setup();
    await abrirEEscolher(user, [
      arquivo('maria_aparecida_de_souza.jpg'),
      arquivo('Joao Lima.png', 'image/png'),
      arquivo('IMG_2041.jpg'),
      arquivo('documento.pdf', 'application/pdf'),
    ]);

    expect(
      screen.getByText(/2 fotos serão enviadas · 1 sem ficha · 1 recusada/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Ficha de maria_aparecida_de_souza.jpg')).toHaveValue('maria');
    expect(screen.getByLabelText('Ficha de Joao Lima.png')).toHaveValue('joao');
    expect(screen.getByLabelText('Ficha de IMG_2041.jpg')).toHaveValue('');
    expect(screen.getByText(/Formato não aceito/)).toBeInTheDocument();
    // João já tem foto — a conferência avisa que vai substituir
    expect(screen.getByText('substitui a foto atual')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enviar 2 fotos' }));

    expect(await screen.findByText('2 de 2 fotos enviadas.')).toBeInTheDocument();
    expect(apiClient.uploadFotoFicha).toHaveBeenCalledTimes(2);
    expect(apiClient.uploadFotoFicha).toHaveBeenCalledWith('maria', expect.any(File));
    expect(apiClient.uploadFotoFicha).toHaveBeenCalledWith('joao', expect.any(File));
  });

  it('deixa a pessoa escolher a ficha de uma foto sem sugestão', async () => {
    const user = userEvent.setup();
    await abrirEEscolher(user, [arquivo('IMG_2041.jpg')]);

    expect(screen.getByRole('button', { name: 'Enviar 0 fotos' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Ficha de IMG_2041.jpg'), 'maria');
    await user.click(screen.getByRole('button', { name: 'Enviar 1 foto' }));

    expect(await screen.findByText('1 de 1 fotos enviadas.')).toBeInTheDocument();
    expect(apiClient.uploadFotoFicha).toHaveBeenCalledWith('maria', expect.any(File));
  });

  it('bloqueia o envio quando duas fotos apontam pra mesma ficha', async () => {
    const user = userEvent.setup();
    await abrirEEscolher(user, [
      arquivo('Maria Souza.jpg'),
      arquivo('maria_aparecida_de_souza.jpg'),
    ]);

    expect(screen.getAllByText('Ficha escolhida em outra foto')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Enviar 2 fotos' })).toBeDisabled();
  });

  it('mostra no resumo a foto que falhou, sem parar as outras', async () => {
    vi.mocked(apiClient.uploadFotoFicha)
      .mockRejectedValueOnce(new ApiError('Ficha não encontrada', 404, null))
      .mockResolvedValueOnce({} as never);
    const user = userEvent.setup();
    await abrirEEscolher(user, [
      arquivo('Joao Pedro Lima.jpg'),
      arquivo('Maria Aparecida de Souza.jpg'),
    ]);

    await user.click(screen.getByRole('button', { name: 'Enviar 2 fotos' }));

    expect(await screen.findByText('1 de 2 fotos enviadas.')).toBeInTheDocument();
    expect(screen.getByText('Joao Pedro Lima.jpg: Ficha não encontrada')).toBeInTheDocument();
  });
});
