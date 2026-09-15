import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FichasService } from './fichas.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fotoStorage from '../../common/uploads/foto-storage';

// Testes do upload de foto (docs/propostas.md, proposta #4) — o resto do CRUD é simples o
// bastante (sem regra de negócio) pra não pedir spec própria. PrismaService e o módulo de
// storage (fs real) são mockados.
jest.mock('../../common/uploads/foto-storage', () => ({
  ...jest.requireActual('../../common/uploads/foto-storage'),
  salvarFoto: jest.fn(),
  removerFoto: jest.fn(),
  encontrarFoto: jest.fn(),
  streamFoto: jest.fn(),
}));

const FICHA_ID = 'ficha-1';
const PAROQUIA_ID = 'paroquia-1';

function criarPrismaMock() {
  return {
    ficha: {
      findUnique: jest.fn().mockResolvedValue({ id: FICHA_ID, paroquiaId: PAROQUIA_ID }),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function arquivoFake(overrides: Partial<fotoStorage.ArquivoRecebido> = {}): fotoStorage.ArquivoRecebido {
  return {
    originalname: 'foto.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake'),
    ...overrides,
  };
}

describe('FichasService — upload de foto', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let service: FichasService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = criarPrismaMock();
    service = new FichasService(prisma as unknown as PrismaService);
  });

  describe('uploadFoto', () => {
    it('rejeita quando nenhum arquivo é enviado', async () => {
      await expect(service.uploadFoto(FICHA_ID, undefined, PAROQUIA_ID)).rejects.toThrow(BadRequestException);
      expect(fotoStorage.salvarFoto).not.toHaveBeenCalled();
    });

    it('rejeita formato que não é JPEG/PNG/WEBP', async () => {
      await expect(service.uploadFoto(FICHA_ID, arquivoFake({ mimetype: 'application/pdf' }), PAROQUIA_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(fotoStorage.salvarFoto).not.toHaveBeenCalled();
    });

    it('rejeita arquivo acima de 5 MB', async () => {
      await expect(
        service.uploadFoto(FICHA_ID, arquivoFake({ size: fotoStorage.MAX_FOTO_BYTES + 1 }), PAROQUIA_ID),
      ).rejects.toThrow(BadRequestException);
      expect(fotoStorage.salvarFoto).not.toHaveBeenCalled();
    });

    it('rejeita quando a ficha não existe', async () => {
      prisma.ficha.findUnique.mockResolvedValue(null);
      await expect(service.uploadFoto(FICHA_ID, arquivoFake(), PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('salva o arquivo e grava a URL de acesso na ficha', async () => {
      await service.uploadFoto(FICHA_ID, arquivoFake(), PAROQUIA_ID);

      expect(fotoStorage.salvarFoto).toHaveBeenCalledWith(expect.any(String), FICHA_ID, 'image/jpeg', expect.any(Buffer));
      expect(prisma.ficha.update).toHaveBeenCalledWith({
        where: { id: FICHA_ID },
        data: { fotoUrl: `/fichas/${FICHA_ID}/foto` },
      });
    });
  });

  describe('removerFoto', () => {
    it('remove o arquivo e limpa fotoUrl', async () => {
      await service.removerFoto(FICHA_ID, PAROQUIA_ID);

      expect(fotoStorage.removerFoto).toHaveBeenCalledWith(expect.any(String), FICHA_ID);
      expect(prisma.ficha.update).toHaveBeenCalledWith({ where: { id: FICHA_ID }, data: { fotoUrl: null } });
    });
  });

  describe('streamFoto', () => {
    it('rejeita com 404 quando a ficha não tem foto', async () => {
      (fotoStorage.encontrarFoto as jest.Mock).mockResolvedValue(null);
      await expect(service.streamFoto(FICHA_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('retorna o stream e o mimetype quando a foto existe', async () => {
      (fotoStorage.encontrarFoto as jest.Mock).mockResolvedValue({ caminho: '/x/ficha-1.jpg', mimetype: 'image/jpeg' });
      (fotoStorage.streamFoto as jest.Mock).mockReturnValue('stream-fake');

      const resultado = await service.streamFoto(FICHA_ID, PAROQUIA_ID);

      expect(fotoStorage.streamFoto).toHaveBeenCalledWith('/x/ficha-1.jpg');
      expect(resultado).toEqual({ stream: 'stream-fake', mimetype: 'image/jpeg' });
    });
  });

  describe('remove', () => {
    it('remove o arquivo de foto junto com a ficha', async () => {
      await service.remove(FICHA_ID, PAROQUIA_ID);

      expect(fotoStorage.removerFoto).toHaveBeenCalledWith(expect.any(String), FICHA_ID);
      expect(prisma.ficha.delete).toHaveBeenCalledWith({ where: { id: FICHA_ID } });
    });
  });
});
