import { describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-client';
import {
  comRetentativa,
  fichasRepetidas,
  motivoRecusa,
  sugerirVinculo,
  tokensDoNome,
  type CandidatoFoto,
} from './fotos-lote';

const candidatos: CandidatoFoto[] = [
  { id: 'maria', nome: 'Maria Aparecida de Souza', temFoto: false },
  { id: 'joao', nome: 'João Pedro Lima', temFoto: true },
  { id: 'joao2', nome: 'João Lima Neto', temFoto: false },
  { id: 'casal', nome: 'José Ribeiro e Ana Ribeiro', temFoto: false },
];

describe('tokensDoNome', () => {
  it('ignora acento, caixa, extensão, separadores, cópia "(2)" e "de/da/e"', () => {
    expect(tokensDoNome('MARIA_Aparecida-de.Souza (2).JPG')).toEqual([
      'maria',
      'aparecida',
      'souza',
    ]);
    expect(tokensDoNome('João Pedro Lima.jpeg')).toEqual(['joao', 'pedro', 'lima']);
  });

  it('ignora números soltos no nome do arquivo', () => {
    expect(tokensDoNome('IMG_2041.jpg')).toEqual(['img']);
  });
});

describe('sugerirVinculo', () => {
  it('casa exato mesmo com acento, caixa e separadores diferentes', () => {
    expect(sugerirVinculo('maria_aparecida_de_souza.jpg', candidatos)).toEqual({
      tipo: 'exato',
      candidatoId: 'maria',
    });
  });

  it('casa parcial quando as palavras do arquivo estão no nome de uma única ficha', () => {
    expect(sugerirVinculo('Maria Souza.png', candidatos)).toEqual({
      tipo: 'parcial',
      candidatoId: 'maria',
    });
  });

  it('casal casa pelo nome dos dois', () => {
    expect(sugerirVinculo('Jose e Ana Ribeiro.jpg', candidatos)).toEqual({
      tipo: 'parcial',
      candidatoId: 'casal',
    });
  });

  it('marca ambíguo quando mais de uma ficha serve — a pessoa escolhe', () => {
    expect(sugerirVinculo('Joao Lima.jpg', candidatos)).toEqual({
      tipo: 'ambiguo',
      opcoes: ['joao', 'joao2'],
    });
  });

  it('não sugere nada com uma palavra só (primeiro nome é fraco demais)', () => {
    expect(sugerirVinculo('Maria.jpg', candidatos)).toEqual({ tipo: 'nenhum' });
  });

  it('não sugere nada para nome de câmera ou nome desconhecido', () => {
    expect(sugerirVinculo('IMG_2041.jpg', candidatos)).toEqual({ tipo: 'nenhum' });
    expect(sugerirVinculo('Carlos Alberto.jpg', candidatos)).toEqual({ tipo: 'nenhum' });
  });
});

describe('motivoRecusa', () => {
  it('aceita JPEG/PNG/WEBP até 5 MB', () => {
    expect(motivoRecusa({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toBeNull();
    expect(motivoRecusa({ type: 'image/webp', size: 10 })).toBeNull();
  });

  it('recusa outro formato ou arquivo grande demais', () => {
    expect(motivoRecusa({ type: 'image/heic', size: 10 })).toMatch(/Formato/);
    expect(motivoRecusa({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
  });
});

describe('fichasRepetidas', () => {
  it('aponta a ficha escolhida por mais de um arquivo', () => {
    expect(fichasRepetidas(['a', 'b', null, 'a', 'c'])).toEqual(new Set(['a']));
    expect(fichasRepetidas(['a', 'b', null])).toEqual(new Set());
  });
});

describe('comRetentativa', () => {
  const semEspera = () => Promise.resolve();

  it('devolve o resultado quando dá certo de primeira', async () => {
    await expect(comRetentativa(() => Promise.resolve('ok'), semEspera)).resolves.toBe('ok');
  });

  it('espera 60s e tenta de novo quando o server responde 429', async () => {
    const enviar = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('Too Many Requests', 429, null))
      .mockResolvedValueOnce('ok');
    const esperar = vi.fn(semEspera);

    await expect(comRetentativa(enviar, esperar)).resolves.toBe('ok');
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(esperar).toHaveBeenCalledWith(60_000);
  });

  it('desiste depois de 3 tentativas com 429', async () => {
    const enviar = vi.fn().mockRejectedValue(new ApiError('Too Many Requests', 429, null));

    await expect(comRetentativa(enviar, semEspera)).rejects.toThrow('Too Many Requests');
    expect(enviar).toHaveBeenCalledTimes(3);
  });

  it('não tenta de novo em outros erros', async () => {
    const enviar = vi.fn().mockRejectedValue(new ApiError('Ficha não encontrada', 404, null));

    await expect(comRetentativa(enviar, semEspera)).rejects.toThrow('Ficha não encontrada');
    expect(enviar).toHaveBeenCalledTimes(1);
  });
});
