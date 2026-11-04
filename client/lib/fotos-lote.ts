import { ApiError } from './api-client';

// Upload de fotos em lote (#59) — lógica pura, sem React: casar cada arquivo com uma ficha pelo
// nome do arquivo e enviar respeitando o rate limit do server. A tela de conferência
// (components/fichas/upload-fotos-lote-dialog.tsx) mostra a sugestão e deixa a pessoa corrigir
// antes de qualquer envio — nada é vinculado sozinho.

export const TIPOS_FOTO_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
export const TAMANHO_MAXIMO_FOTO_BYTES = 5 * 1024 * 1024;

// Palavras que não ajudam a distinguir pessoas ("Maria DE Souza", "João E Ana").
const PALAVRAS_IGNORADAS = new Set(['e', 'de', 'da', 'do', 'das', 'dos']);

export interface CandidatoFoto {
  id: string;
  nome: string;
  temFoto: boolean;
}

export type Vinculo =
  | { tipo: 'exato'; candidatoId: string }
  | { tipo: 'parcial'; candidatoId: string }
  | { tipo: 'ambiguo'; opcoes: string[] }
  | { tipo: 'nenhum' };

/** "Maria_Aparecida-SOUZA (2).jpg" -> ["maria", "aparecida", "souza"] */
export function tokensDoNome(nome: string): string[] {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '') // extensão
    .replace(/\(\d+\)/g, ' ') // "(2)" de cópia de arquivo
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !PALAVRAS_IGNORADAS.has(t));
}

/**
 * Sugere a ficha de um arquivo pelo nome:
 * - exato: mesmas palavras do nome da ficha (ignorando acento, caixa, separadores e "de/da/e");
 * - parcial: todas as palavras do arquivo (pelo menos duas) estão no nome de uma única ficha —
 *   cobre "Maria Souza.jpg" pra "Maria Aparecida de Souza";
 * - ambiguo: mais de uma ficha serve — a pessoa escolhe;
 * - nenhum: nada serve.
 */
export function sugerirVinculo(nomeArquivo: string, candidatos: CandidatoFoto[]): Vinculo {
  const doArquivo = tokensDoNome(nomeArquivo);
  if (doArquivo.length === 0) return { tipo: 'nenhum' };
  const chave = doArquivo.join(' ');

  const exatos = candidatos.filter((c) => tokensDoNome(c.nome).join(' ') === chave);
  if (exatos.length === 1) return { tipo: 'exato', candidatoId: exatos[0].id };
  if (exatos.length > 1) return { tipo: 'ambiguo', opcoes: exatos.map((c) => c.id) };

  if (doArquivo.length < 2) return { tipo: 'nenhum' };
  const parciais = candidatos.filter((c) => {
    const doCandidato = new Set(tokensDoNome(c.nome));
    return doArquivo.every((t) => doCandidato.has(t));
  });
  if (parciais.length === 1) return { tipo: 'parcial', candidatoId: parciais[0].id };
  if (parciais.length > 1) return { tipo: 'ambiguo', opcoes: parciais.map((c) => c.id) };
  return { tipo: 'nenhum' };
}

/** Motivo de recusa do arquivo (mesmas regras do upload individual e do server), ou null. */
export function motivoRecusa(arquivo: { type: string; size: number }): string | null {
  if (!TIPOS_FOTO_ACEITOS.includes(arquivo.type))
    return 'Formato não aceito (use JPEG, PNG ou WEBP)';
  if (arquivo.size > TAMANHO_MAXIMO_FOTO_BYTES) return 'Arquivo acima de 5 MB';
  return null;
}

/** Ids de ficha escolhidos por mais de um arquivo — só um pode ficar com cada ficha. */
export function fichasRepetidas(escolhas: (string | null)[]): Set<string> {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const id of escolhas) {
    if (!id) continue;
    if (vistos.has(id)) repetidos.add(id);
    vistos.add(id);
  }
  return repetidos;
}

const ESPERA_429_MS = 60_000;
const MAX_TENTATIVAS_429 = 3;

/**
 * Roda `enviar` e, se o server responder 429 (rate limit: 100 req/min por rota, ver
 * server/src/app.module.ts), espera a janela do limite (60s) e tenta de novo — em vez de afrouxar
 * o limite no server. O header Retry-After não é exposto pelo CORS, por isso a espera é fixa.
 * Outros erros sobem direto.
 */
export async function comRetentativa<T>(
  enviar: () => Promise<T>,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  aoEsperar?: (ms: number) => void,
): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await enviar();
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 429 || tentativa >= MAX_TENTATIVAS_429) {
        throw err;
      }
      aoEsperar?.(ESPERA_429_MS);
      await esperar(ESPERA_429_MS);
    }
  }
}
