import { createReadStream } from 'fs';
import { mkdir, readdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

// Upload de foto 3x4 (Ficha do Jovem / Ficha do Casal) — docs/propostas.md, proposta #4.
// Mesmo padrão dos Quadrantes (binário no filesystem, banco só guarda a URL de acesso — ver
// quadrantes.service.ts), mas aqui é 1 arquivo por registro, não N: o nome do arquivo em disco
// é o próprio id, com a extensão do mimetype recebido. Reaproveitado por FichasService e
// FichasCasaisService, cada um com seu próprio subdiretório.

export interface ArquivoRecebido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const MAX_FOTO_BYTES = 5 * 1024 * 1024;

const EXTENSAO_POR_MIMETYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function mimetypeAceito(mimetype: string): boolean {
  return mimetype in EXTENSAO_POR_MIMETYPE;
}

async function arquivosDoId(dir: string, id: string): Promise<string[]> {
  const nomes = await readdir(dir).catch(() => [] as string[]);
  return nomes.filter((nome) => nome.startsWith(`${id}.`));
}

// Antes de salvar uma foto nova, remove qualquer arquivo antigo desse id — inclusive se veio
// com outra extensão (pessoa trocou de .jpg pra .png, por exemplo). Sem isso, o antigo ficaria
// órfão no disco pra sempre (o registro no banco só aponta pra um nome de cada vez).
export async function salvarFoto(dir: string, id: string, mimetype: string, buffer: Buffer): Promise<void> {
  const extensao = EXTENSAO_POR_MIMETYPE[mimetype];
  await mkdir(dir, { recursive: true });
  await Promise.all((await arquivosDoId(dir, id)).map((nome) => unlink(join(dir, nome)).catch(() => undefined)));
  await writeFile(join(dir, `${id}.${extensao}`), buffer);
}

export async function removerFoto(dir: string, id: string): Promise<void> {
  await Promise.all((await arquivosDoId(dir, id)).map((nome) => unlink(join(dir, nome)).catch(() => undefined)));
}

export async function encontrarFoto(dir: string, id: string): Promise<{ caminho: string; mimetype: string } | null> {
  const [nome] = await arquivosDoId(dir, id);
  if (!nome) return null;
  const extensao = nome.split('.').pop() ?? '';
  const mimetype = Object.entries(EXTENSAO_POR_MIMETYPE).find(([, ext]) => ext === extensao)?.[0];
  return { caminho: join(dir, nome), mimetype: mimetype ?? 'application/octet-stream' };
}

export function streamFoto(caminho: string) {
  return createReadStream(caminho);
}
