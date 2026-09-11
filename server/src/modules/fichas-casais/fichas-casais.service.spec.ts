import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FichasCasaisService } from './fichas-casais.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fotoStorage from '../../common/uploads/foto-storage';

// Mesmo teste do upload de foto da FichasService (docs/propostas.md, proposta #4) — os dois
// módulos usam o mesmo helper de storage, um arquivo por registro.
jest.mock('../../common/uploads/foto-storage', () => ({
  ...jest.requireActual('../../common/uploads/foto-storage'),
  salvarFoto: jest.fn(),
  removerFoto: jest.fn(),
  encontrarFoto: jest.fn(),
  streamFoto: jest.fn(),
}));

const CASAL_ID = 'casal-1';

function criarPrismaMock() {
  return {
    fichaCasal: {
      findUnique: jest.fn().mockResolvedValue({ id: CASAL_ID }),
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

describe('FichasCasaisService — upload de foto', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let service: FichasCasaisService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = criarPrismaMock();
    service = new FichasCasaisService(prisma as unknown as PrismaService);
  });

  describe('uploadFoto', () => {
    it('rejeita quando nenhum arquivo é enviado', async () => {
      await expect(service.uploadFoto(CASAL_ID, undefined)).rejects.toThrow(BadRequestException);
      expect(fotoStorage.salvarFoto).not.toHaveBeenCalled();
    });

    it('rejeita formato que não é JPEG/PNG/WEBP', async () => {
      await expect(service.uploadFoto(CASAL_ID, arquivoFake({ mimetype: 'application/pdf' }))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejeita arquivo acima de 5 MB', async () => {
      await expect(
        service.uploadFoto(CASAL_ID, arquivoFake({ size: fotoStorage.MAX_FOTO_BYTES + 1 })),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita quando a ficha de casal não existe', async () => {
      prisma.fichaCasal.findUnique.mockResolvedValue(null);
      await expect(service.uploadFoto(CASAL_ID, arquivoFake())).rejects.toThrow(NotFoundException);
    });

    it('salva o arquivo e grava a URL de acesso', async () => {
      await service.uploadFoto(CASAL_ID, arquivoFake());

      expect(fotoStorage.salvarFoto).toHaveBeenCalledWith(expect.any(String), CASAL_ID, 'image/jpeg', expect.any(Buffer));
      expect(prisma.fichaCasal.update).toHaveBeenCalledWith({
        where: { id: CASAL_ID },
        data: { fotoUrl: `/fichas-casais/${CASAL_ID}/foto` },
      });
    });
  });

  describe('removerFoto', () => {
    it('remove o arquivo e limpa fotoUrl', async () => {
      await service.removerFoto(CASAL_ID);

      expect(fotoStorage.removerFoto).toHaveBeenCalledWith(expect.any(String), CASAL_ID);
      expect(prisma.fichaCasal.update).toHaveBeenCalledWith({ where: { id: CASAL_ID }, data: { fotoUrl: null } });
    });
  });

  describe('streamFoto', () => {
    it('rejeita com 404 quando não tem foto', async () => {
      (fotoStorage.encontrarFoto as jest.Mock).mockResolvedValue(null);
      await expect(service.streamFoto(CASAL_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('remove o arquivo de foto junto com o registro', async () => {
      await service.remove(CASAL_ID);

      expect(fotoStorage.removerFoto).toHaveBeenCalledWith(expect.any(String), CASAL_ID);
      expect(prisma.fichaCasal.delete).toHaveBeenCalledWith({ where: { id: CASAL_ID } });
    });
  });
});
