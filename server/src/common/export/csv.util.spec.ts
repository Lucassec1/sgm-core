import { toCsv } from './csv.util';

describe('toCsv', () => {
  it('monta cabeçalho e linhas separados por ; com BOM no início', () => {
    const csv = toCsv(
      ['nome', 'idade'],
      [
        ['Ana', 20],
        ['Bia', 25],
      ],
    );
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿nome;idade\r\nAna;20\r\nBia;25');
  });

  it('escapa campo com vírgula, ponto e vírgula, aspas ou quebra de linha', () => {
    const csv = toCsv(['campo'], [['a;b'], ['a"b'], ['a\nb'], ['a,b']]);
    const linhas = csv.replace('﻿', '').split('\r\n');
    expect(linhas[1]).toBe('"a;b"');
    expect(linhas[2]).toBe('"a""b"');
    expect(linhas[3]).toBe('"a\nb"');
    expect(linhas[4]).toBe('"a,b"');
  });

  it('converte Date para ISO string', () => {
    const data = new Date('2026-01-01T00:00:00.000Z');
    const csv = toCsv(['data'], [[data]]);
    expect(csv).toContain(data.toISOString());
  });

  it('trata null e undefined como string vazia', () => {
    const csv = toCsv(['a', 'b'], [[null, undefined]]);
    expect(csv).toBe('﻿a;b\r\n;');
  });
});
