import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuadrantesService } from './quadrantes.service';
import { LogAtividadeService } from './log-atividade.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('../../common/uploads/s3-storage', () => ({
  putObject: jest.fn(),
  deleteObject: jest.fn().mockResolvedValue(undefined),
  getObject: jest.fn(),
}));
jest.mock('crypto', () => ({ randomUUID: () => 'uuid-fixo' }));

import { putObject, deleteObject, getObject } from '../../common/uploads/s3-storage';

const MONTAGEM_ID = 'montagem-1';
const QUADRANTE_ID = 'quadrante-1';

function criarPrismaMock() {
  return {
    montagem: { findUnique: jest.fn().mockResolvedValue({ id: MONTAGEM_ID }) },
    quadranteArquivo: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function criarLogAtividadeMock() {
  return { registrar: jest.fn() };
}

function arquivoFake(
  overrides: Partial<{ originalname: string; mimetype: string; size: number; buffer: Buffer }> = {},
) {
  return {
    originalname: 'quadrante.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('fake'),
    ...overrides,
  };
}

describe('QuadrantesService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let logAtividade: ReturnType<typeof criarLogAtividadeMock>;
  let service: QuadrantesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = criarPrismaMock();
    logAtividade = criarLogAtividadeMock();
    service = new QuadrantesService(
      prisma as unknown as PrismaService,
      logAtividade as unknown as LogAtividadeService,
    );
  });

  describe('listar', () => {
    it('rejeita com 404 se a montagem não existe', async () => {
      prisma.montagem.findUnique.mockResolvedValue(null);
      await expect(service.listar(MONTAGEM_ID)).rejects.toThrow(NotFoundException);
    });

    it('lista os arquivos da montagem, mais recentes primeiro', async () => {
      await service.listar(MONTAGEM_ID);
      expect(prisma.quadranteArquivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { montagemId: MONTAGEM_ID },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('adicionar', () => {
    it('rejeita quando nenhum arquivo é enviado', async () => {
      await expect(service.adicionar(MONTAGEM_ID, undefined, 'Ana')).rejects.toThrow(
        BadRequestException,
      );
      expect(putObject).not.toHaveBeenCalled();
    });

    it('rejeita arquivo que não é PDF', async () => {
      await expect(
        service.adicionar(MONTAGEM_ID, arquivoFake({ mimetype: 'image/png' }), 'Ana'),
      ).rejects.toThrow(BadRequestException);
      expect(putObject).not.toHaveBeenCalled();
    });

    it('rejeita arquivo acima de 50 MB', async () => {
      await expect(
        service.adicionar(MONTAGEM_ID, arquivoFake({ size: 50 * 1024 * 1024 + 1 }), 'Ana'),
      ).rejects.toThrow(BadRequestException);
      expect(putObject).not.toHaveBeenCalled();
    });

    it('rejeita com 404 se a montagem não existe', async () => {
      prisma.montagem.findUnique.mockResolvedValue(null);
      await expect(service.adicionar(MONTAGEM_ID, arquivoFake(), 'Ana')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('salva o arquivo no S3, grava o registro e loga a atividade', async () => {
      prisma.quadranteArquivo.create.mockResolvedValue({
        id: QUADRANTE_ID,
        montagemId: MONTAGEM_ID,
      });

      const resultado = await service.adicionar(MONTAGEM_ID, arquivoFake(), 'Ana');

      expect(putObject).toHaveBeenCalledWith(
        `quadrantes/${MONTAGEM_ID}/uuid-fixo.pdf`,
        expect.any(Buffer),
        'application/pdf',
      );
      expect(prisma.quadranteArquivo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          montagemId: MONTAGEM_ID,
          nomeOriginal: 'quadrante.pdf',
          armazenadoComo: 'uuid-fixo.pdf',
          mimeType: 'application/pdf',
          tamanhoBytes: 1024,
          usuario: 'Ana',
        }),
      });
      expect(logAtividade.registrar).toHaveBeenCalledWith(
        MONTAGEM_ID,
        'Ana',
        'ADICIONOU_QUADRANTE',
        'quadrante.pdf',
      );
      expect(resultado).toEqual({ id: QUADRANTE_ID, montagemId: MONTAGEM_ID });
    });

    it('grava usuario null quando não informado', async () => {
      prisma.quadranteArquivo.create.mockResolvedValue({ id: QUADRANTE_ID });
      await service.adicionar(MONTAGEM_ID, arquivoFake(), undefined);
      expect(prisma.quadranteArquivo.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ usuario: null }) }),
      );
    });
  });

  describe('paraDownload', () => {
    it('rejeita com 404 se o registro não existe', async () => {
      prisma.quadranteArquivo.findUnique.mockResolvedValue(null);
      await expect(service.paraDownload(MONTAGEM_ID, QUADRANTE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejeita com 404 se o registro é de outra montagem', async () => {
      prisma.quadranteArquivo.findUnique.mockResolvedValue({
        id: QUADRANTE_ID,
        montagemId: 'outra-montagem',
      });
      await expect(service.paraDownload(MONTAGEM_ID, QUADRANTE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devolve o registro e um stream de leitura do S3', async () => {
      const registro = {
        id: QUADRANTE_ID,
        montagemId: MONTAGEM_ID,
        armazenadoComo: 'uuid-fixo.pdf',
      };
      prisma.quadranteArquivo.findUnique.mockResolvedValue(registro);
      (getObject as jest.Mock).mockResolvedValue({
        stream: 'stream-fake',
        contentType: 'application/pdf',
      });

      const resultado = await service.paraDownload(MONTAGEM_ID, QUADRANTE_ID);

      expect(getObject).toHaveBeenCalledWith(`quadrantes/${MONTAGEM_ID}/uuid-fixo.pdf`);
      expect(resultado).toEqual({ registro, stream: 'stream-fake' });
    });

    it('rejeita com 404 se o objeto não existe mais no S3', async () => {
      prisma.quadranteArquivo.findUnique.mockResolvedValue({
        id: QUADRANTE_ID,
        montagemId: MONTAGEM_ID,
        armazenadoComo: 'uuid-fixo.pdf',
      });
      (getObject as jest.Mock).mockResolvedValue(null);

      await expect(service.paraDownload(MONTAGEM_ID, QUADRANTE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remover', () => {
    it('rejeita com 404 se o registro não existe', async () => {
      prisma.quadranteArquivo.findUnique.mockResolvedValue(null);
      await expect(service.remover(MONTAGEM_ID, QUADRANTE_ID, 'Ana')).rejects.toThrow(
        NotFoundException,
      );
      expect(deleteObject).not.toHaveBeenCalled();
    });

    it('rejeita com 404 se o registro é de outra montagem', async () => {
      prisma.quadranteArquivo.findUnique.mockResolvedValue({
        id: QUADRANTE_ID,
        montagemId: 'outra-montagem',
      });
      await expect(service.remover(MONTAGEM_ID, QUADRANTE_ID, 'Ana')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('remove o objeto no S3, apaga o registro e loga a atividade', async () => {
      const registro = {
        id: QUADRANTE_ID,
        montagemId: MONTAGEM_ID,
        armazenadoComo: 'uuid-fixo.pdf',
        nomeOriginal: 'quadrante.pdf',
      };
      prisma.quadranteArquivo.findUnique.mockResolvedValue(registro);

      const resultado = await service.remover(MONTAGEM_ID, QUADRANTE_ID, 'Ana');

      expect(deleteObject).toHaveBeenCalledWith(`quadrantes/${MONTAGEM_ID}/uuid-fixo.pdf`);
      expect(prisma.quadranteArquivo.delete).toHaveBeenCalledWith({ where: { id: QUADRANTE_ID } });
      expect(logAtividade.registrar).toHaveBeenCalledWith(
        MONTAGEM_ID,
        'Ana',
        'REMOVEU_QUADRANTE',
        'quadrante.pdf',
      );
      expect(resultado).toEqual(registro);
    });

    it('não falha se o objeto no S3 já não existir (deleteObject é idempotente)', async () => {
      const registro = {
        id: QUADRANTE_ID,
        montagemId: MONTAGEM_ID,
        armazenadoComo: 'uuid-fixo.pdf',
        nomeOriginal: 'quadrante.pdf',
      };
      prisma.quadranteArquivo.findUnique.mockResolvedValue(registro);

      await expect(service.remover(MONTAGEM_ID, QUADRANTE_ID, 'Ana')).resolves.toEqual(registro);
    });
  });
});
