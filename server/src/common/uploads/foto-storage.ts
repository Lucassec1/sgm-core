import type { Readable } from 'stream';
import { deleteObject, getObject, putObject } from './s3-storage';

// Upload de foto 3x4 (Ficha do Jovem / Ficha do Casal) — docs/propostas.md, proposta #4.
// Reaproveitado por FichasService e FichasCasaisService, cada um com seu próprio prefixo de
// chave no S3 (`fichas` / `fichas-casais`). Chave fixa (`${prefixo}/${id}`, sem extensão) —
// o Content-Type vai como metadado do objeto no S3, então trocar de foto é só sobrescrever a
// mesma chave (sem precisar "achar e apagar o arquivo antigo" como no filesystem, onde a
// extensão podia mudar entre uploads).

export interface ArquivoRecebido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const MAX_FOTO_BYTES = 5 * 1024 * 1024;

const MIMETYPES_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function mimetypeAceito(mimetype: string): boolean {
  return MIMETYPES_ACEITOS.has(mimetype);
}

function chave(prefixo: string, id: string): string {
  return `${prefixo}/${id}`;
}

export async function salvarFoto(
  prefixo: string,
  id: string,
  mimetype: string,
  buffer: Buffer,
): Promise<void> {
  await putObject(chave(prefixo, id), buffer, mimetype);
}

export async function removerFoto(prefixo: string, id: string): Promise<void> {
  await deleteObject(chave(prefixo, id));
}

export async function encontrarFoto(
  prefixo: string,
  id: string,
): Promise<{ stream: Readable; mimetype: string } | null> {
  const objeto = await getObject(chave(prefixo, id));
  if (!objeto) return null;
  return { stream: objeto.stream, mimetype: objeto.contentType };
}
