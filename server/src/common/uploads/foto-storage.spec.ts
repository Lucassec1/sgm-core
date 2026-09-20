jest.mock('./s3-storage', () => ({
  putObject: jest.fn(),
  deleteObject: jest.fn(),
  getObject: jest.fn(),
}));

import { putObject, deleteObject, getObject } from './s3-storage';
import { salvarFoto, removerFoto, encontrarFoto, mimetypeAceito } from './foto-storage';

describe('foto-storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mimetypeAceito', () => {
    it.each(['image/jpeg', 'image/png', 'image/webp'])('aceita %s', (mime) => {
      expect(mimetypeAceito(mime)).toBe(true);
    });

    it('rejeita mimetype fora da lista', () => {
      expect(mimetypeAceito('application/pdf')).toBe(false);
    });
  });

  describe('salvarFoto', () => {
    it('salva no S3 com chave prefixo/id', async () => {
      const buffer = Buffer.from('foto');
      await salvarFoto('fichas', 'ficha-1', 'image/jpeg', buffer);
      expect(putObject).toHaveBeenCalledWith('fichas/ficha-1', buffer, 'image/jpeg');
    });
  });

  describe('removerFoto', () => {
    it('remove do S3 pela chave prefixo/id', async () => {
      await removerFoto('fichas-casais', 'casal-1');
      expect(deleteObject).toHaveBeenCalledWith('fichas-casais/casal-1');
    });
  });

  describe('encontrarFoto', () => {
    it('devolve null quando não existe', async () => {
      (getObject as jest.Mock).mockResolvedValue(null);
      expect(await encontrarFoto('fichas', 'ficha-1')).toBeNull();
    });

    it('devolve stream e mimetype quando existe', async () => {
      (getObject as jest.Mock).mockResolvedValue({
        stream: 'stream-fake',
        contentType: 'image/png',
      });
      const resultado = await encontrarFoto('fichas', 'ficha-1');
      expect(getObject).toHaveBeenCalledWith('fichas/ficha-1');
      expect(resultado).toEqual({ stream: 'stream-fake', mimetype: 'image/png' });
    });
  });
});
