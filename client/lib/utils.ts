import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { apiClient } from './api-client';
import type { VagaMontagem } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// `fotoUrl` pode ser um caminho relativo servido pela API (upload real — proposta #4, ver
// docs/historico/propostas.md) ou uma URL externa completa (dado antigo, de quando o campo era um link
// colado à mão). Só o primeiro caso precisa do prefixo do host da API.
export function fotoSrc(fotoUrl?: string | null): string | undefined {
  if (!fotoUrl) return undefined;
  return fotoUrl.startsWith('http') ? fotoUrl : `${apiClient.baseUrl}${fotoUrl}`;
}

// Agrupa as vagas por equipe, na ordem de exibição das 16 equipes (Equipe.ordem) — usado no
// Quadro de Equipes e no modo telão (docs/historico/propostas.md, proposta #5).
export function agruparVagasPorEquipe(vagas: VagaMontagem[]) {
  const grupos = new Map<string, VagaMontagem[]>();
  for (const vaga of vagas) {
    const lista = grupos.get(vaga.equipeId) ?? [];
    lista.push(vaga);
    grupos.set(vaga.equipeId, lista);
  }
  return [...grupos.values()].sort((a, b) => a[0].equipe.ordem - b[0].equipe.ordem);
}

// A API devolve campos opcionais como `null`; react-hook-form espera `undefined` pra
// casar com o tipo inferido do schema zod (`string | undefined`, não `string | null`).
export function nullsToUndefined<T extends object>(
  obj: T,
): { [K in keyof T]: Exclude<T[K], null> | undefined } {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value === null ? undefined : value]),
  ) as never;
}
