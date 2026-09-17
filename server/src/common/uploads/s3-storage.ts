import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

// Armazenamento de arquivos (fotos de Ficha/FichaCasal, PDFs de Quadrantes) — S3 em vez de
// filesystem local, porque a hospedagem (Render) tem disco efêmero: qualquer arquivo salvo
// localmente some no próximo restart/deploy. Bucket é privado (Block all public access ligado);
// o server é sempre quem busca e entrega o arquivo (streamAtual), nunca uma URL pública direta
// — mesma política de acesso que já existia com o filesystem (atrás do JwtAuthGuard/guards de
// paróquia), só troca onde o byte mora.
const s3 = new S3Client({ region: process.env.AWS_REGION });

function bucket(): string {
  const nome = process.env.S3_BUCKET_NAME;
  if (!nome) throw new Error('S3_BUCKET_NAME não configurado');
  return nome;
}

export async function putObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: buffer, ContentType: contentType }),
  );
}

// Idempotente — não lança se o objeto já não existir (mesmo comportamento do `unlink` com
// `.catch(() => undefined)` que o código anterior usava no filesystem).
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })).catch(() => undefined);
}

export async function getObject(
  key: string,
): Promise<{ stream: Readable; contentType: string } | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return {
      stream: res.Body as Readable,
      contentType: res.ContentType ?? 'application/octet-stream',
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'NoSuchKey') return null;
    throw err;
  }
}
