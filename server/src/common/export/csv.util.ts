// Exportação simples (proposta em docs/producao.md, item 4) — CSV puro, sem dependência
// nova, pra alguém não-técnico conseguir tirar um retrato dos dados sozinho (Excel abre CSV
// direto). Não é a exportação .xlsx completa planejada originalmente, é o essencial.

function escapeCsvField(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  let texto = valor instanceof Date ? valor.toISOString() : String(valor);
  // Injeção de fórmula: o Excel executa célula que começa com = + - @ (ou tab/CR) como
  // fórmula — um nome cadastrado como "=HYPERLINK(...)" viraria link malicioso. O apóstrofo
  // faz o Excel tratar como texto. Número e data não passam por aqui como texto livre.
  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) {
    texto = `'${texto}`;
  }
  if (/[",\n;]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const BOM = '﻿'; // garante acentuação correta ao abrir no Excel
  const linhas = [headers, ...rows].map((linha) => linha.map(escapeCsvField).join(';'));
  return BOM + linhas.join('\r\n');
}
