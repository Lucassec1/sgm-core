const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { putObject, deleteObject, getObject } from './s3-storage';

const BUCKET_ORIGINAL = process.env.S3_BUCKET_NAME;

describe('s3-storage', () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.S3_BUCKET_NAME = 'bucket-teste';
  });

  afterAll(() => {
    process.env.S3_BUCKET_NAME = BUCKET_ORIGINAL;
  });

  describe('bucket() (via putObject)', () => {
    it('lança erro claro se S3_BUCKET_NAME não estiver configurado', async () => {
      delete process.env.S3_BUCKET_NAME;
      await expect(putObject('k', Buffer.from('x'), 'text/plain')).rejects.toThrow(
        'S3_BUCKET_NAME não configurado',
      );
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('putObject', () => {
    it('envia PutObjectCommand com bucket, key, body e content-type', async () => {
      sendMock.mockResolvedValue({});
      await putObject('chave', Buffer.from('conteudo'), 'application/pdf');
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'bucket-teste',
        Key: 'chave',
        Body: Buffer.from('conteudo'),
        ContentType: 'application/pdf',
      });
      expect(sendMock).toHaveBeenCalled();
    });
  });

  describe('deleteObject', () => {
    it('envia DeleteObjectCommand com bucket e key', async () => {
      sendMock.mockResolvedValue({});
      await deleteObject('chave');
      expect(DeleteObjectCommand).toHaveBeenCalledWith({ Bucket: 'bucket-teste', Key: 'chave' });
    });

    it('é idempotente — não lança se o send rejeitar', async () => {
      sendMock.mockRejectedValue(new Error('objeto não existe'));
      await expect(deleteObject('chave')).resolves.toBeUndefined();
    });
  });

  describe('getObject', () => {
    it('devolve stream e contentType quando encontrado', async () => {
      sendMock.mockResolvedValue({ Body: 'stream-fake', ContentType: 'image/png' });
      const resultado = await getObject('chave');
      expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'bucket-teste', Key: 'chave' });
      expect(resultado).toEqual({ stream: 'stream-fake', contentType: 'image/png' });
    });

    it('usa application/octet-stream como fallback de content-type', async () => {
      sendMock.mockResolvedValue({ Body: 'stream-fake', ContentType: undefined });
      const resultado = await getObject('chave');
      expect(resultado?.contentType).toBe('application/octet-stream');
    });

    it('devolve null quando o objeto não existe (NoSuchKey)', async () => {
      const erro = new Error('não existe');
      erro.name = 'NoSuchKey';
      sendMock.mockRejectedValue(erro);
      expect(await getObject('chave')).toBeNull();
    });

    it('repropaga outros erros', async () => {
      sendMock.mockRejectedValue(new Error('erro de rede'));
      await expect(getObject('chave')).rejects.toThrow('erro de rede');
    });
  });
});
