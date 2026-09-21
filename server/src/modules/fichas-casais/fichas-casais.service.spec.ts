import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FichasCasaisService } from './fichas-casais.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fotoStorage from '../../common/uploads/foto-storage';

// Mesmo teste do upload de foto da FichasService (docs/historico/propostas.md, proposta #4) — os dois
// módulos usam o mesmo helper de storage, um arquivo por registro.
jest.mock('../../common/uploads/foto-storage', () => ({
  ...jest.requireActual('../../common/uploads/foto-storage'),
  salvarFoto: jest.fn(),
  removerFoto: jest.fn(),
  encontrarFoto: jest.fn(),
  streamFoto: jest.fn(),
}));

const CASAL_ID = 'casal-1';
const PAROQUIA_ID = 'paroquia-1';

function criarPrismaMock() {
  return {
    fichaCasal: {
      findUnique: jest.fn().mockResolvedValue({ id: CASAL_ID, paroquiaId: PAROQUIA_ID }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    alocacao: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function arquivoFake(
  overrides: Partial<fotoStorage.ArquivoRecebido> = {},
): fotoStorage.ArquivoRecebido {
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
      await expect(service.uploadFoto(CASAL_ID, undefined, PAROQUIA_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(fotoStorage.salvarFoto).not.toHaveBeenCalled();
    });

    it('rejeita formato que não é JPEG/PNG/WEBP', async () => {
      await expect(
        service.uploadFoto(CASAL_ID, arquivoFake({ mimetype: 'application/pdf' }), PAROQUIA_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita arquivo acima de 5 MB', async () => {
      await expect(
        service.uploadFoto(
          CASAL_ID,
          arquivoFake({ size: fotoStorage.MAX_FOTO_BYTES + 1 }),
          PAROQUIA_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita quando a ficha de casal não existe', async () => {
      prisma.fichaCasal.findUnique.mockResolvedValue(null);
      await expect(service.uploadFoto(CASAL_ID, arquivoFake(), PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('salva o arquivo e grava a URL de acesso', async () => {
      await service.uploadFoto(CASAL_ID, arquivoFake(), PAROQUIA_ID);

      expect(fotoStorage.salvarFoto).toHaveBeenCalledWith(
        expect.any(String),
        CASAL_ID,
        'image/jpeg',
        expect.any(Buffer),
      );
      expect(prisma.fichaCasal.update).toHaveBeenCalledWith({
        where: { id: CASAL_ID },
        data: { fotoUrl: `/fichas-casais/${CASAL_ID}/foto` },
      });
    });
  });

  describe('removerFoto', () => {
    it('remove o arquivo e limpa fotoUrl', async () => {
      await service.removerFoto(CASAL_ID, PAROQUIA_ID);

      expect(fotoStorage.removerFoto).toHaveBeenCalledWith(expect.any(String), CASAL_ID);
      expect(prisma.fichaCasal.update).toHaveBeenCalledWith({
        where: { id: CASAL_ID },
        data: { fotoUrl: null },
      });
    });
  });

  describe('streamFoto', () => {
    it('rejeita com 404 quando não tem foto', async () => {
      (fotoStorage.encontrarFoto as jest.Mock).mockResolvedValue(null);
      await expect(service.streamFoto(CASAL_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('retorna o stream e o mimetype quando a foto existe', async () => {
      (fotoStorage.encontrarFoto as jest.Mock).mockResolvedValue({
        stream: 'stream-fake',
        mimetype: 'image/jpeg',
      });

      const resultado = await service.streamFoto(CASAL_ID, PAROQUIA_ID);

      expect(resultado).toEqual({ stream: 'stream-fake', mimetype: 'image/jpeg' });
    });
  });

  describe('remove', () => {
    it('remove o arquivo de foto junto com o registro', async () => {
      await service.remove(CASAL_ID, PAROQUIA_ID);

      expect(fotoStorage.removerFoto).toHaveBeenCalledWith(expect.any(String), CASAL_ID);
      expect(prisma.fichaCasal.delete).toHaveBeenCalledWith({ where: { id: CASAL_ID } });
    });

    it('rejeita com 404 se o casal não pertence à paróquia de quem pediu', async () => {
      prisma.fichaCasal.findUnique.mockResolvedValue({
        id: CASAL_ID,
        paroquiaId: 'outra-paroquia',
      });
      await expect(service.remove(CASAL_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.fichaCasal.delete).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('grava o casal com o paroquiaId recebido e normaliza as datas de nascimento', async () => {
      const dto = {
        nomeEle: 'João',
        nomeEla: 'Maria',
        dataNascimentoEle: '1990-01-01',
        dataNascimentoEla: '1991-02-02',
      } as any;
      await service.create(dto, PAROQUIA_ID);

      expect(prisma.fichaCasal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nomeEle: 'João',
          paroquiaId: PAROQUIA_ID,
          dataNascimentoEle: new Date('1990-01-01'),
          dataNascimentoEla: new Date('1991-02-02'),
        }),
      });
    });
  });

  describe('findAll', () => {
    it('filtra por paroquiaId, nome (nomeEle OU nomeEla) e situacao', async () => {
      await service.findAll({ nome: 'Ana', situacao: 'ATIVA' } as any, PAROQUIA_ID);

      expect(prisma.fichaCasal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            paroquiaId: PAROQUIA_ID,
            OR: [
              { nomeEle: { contains: 'Ana', mode: 'insensitive' } },
              { nomeEla: { contains: 'Ana', mode: 'insensitive' } },
            ],
            situacao: 'ATIVA',
          },
        }),
      );
    });

    it('pagina com page/pageSize default e devolve o total', async () => {
      prisma.fichaCasal.count.mockResolvedValue(7);
      const resultado = await service.findAll({} as any, PAROQUIA_ID);

      expect(prisma.fichaCasal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(resultado).toEqual({ items: [], total: 7, page: 1, pageSize: 20 });
    });
  });

  describe('exportCsv', () => {
    it('monta um CSV com uma linha por casal da paróquia', async () => {
      prisma.fichaCasal.findMany.mockResolvedValue([
        {
          nomeEle: 'João',
          nomeEla: 'Maria',
          telefoneEle: '1',
          telefoneEla: '2',
          cidade: 'Crato',
          situacao: 'ATIVA',
        },
      ]);

      const csv = await service.exportCsv(PAROQUIA_ID);

      expect(prisma.fichaCasal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paroquiaId: PAROQUIA_ID } }),
      );
      expect(csv).toContain('João');
      expect(csv).toContain('Maria');
    });
  });

  describe('findOne', () => {
    it('lança NotFoundException se o casal não existe', async () => {
      prisma.fichaCasal.findUnique.mockResolvedValue(null);
      await expect(service.findOne(CASAL_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException (não Forbidden) se o casal é de outra paróquia', async () => {
      prisma.fichaCasal.findUnique.mockResolvedValue({
        id: CASAL_ID,
        paroquiaId: 'outra-paroquia',
      });
      await expect(service.findOne(CASAL_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('não filtra por paroquia quando ele não é informado', async () => {
      const casal = { id: CASAL_ID, paroquiaId: 'qualquer-paroquia' };
      prisma.fichaCasal.findUnique.mockResolvedValue(casal);
      await expect(service.findOne(CASAL_ID)).resolves.toEqual(casal);
    });
  });

  describe('update', () => {
    it('atualiza o casal e normaliza as datas de nascimento quando informadas', async () => {
      await service.update(CASAL_ID, { dataNascimentoEle: '1988-03-10' } as any, PAROQUIA_ID);
      expect(prisma.fichaCasal.update).toHaveBeenCalledWith({
        where: { id: CASAL_ID },
        data: expect.objectContaining({ dataNascimentoEle: new Date('1988-03-10') }),
      });
    });

    it('rejeita com 404 se o casal é de outra paróquia', async () => {
      prisma.fichaCasal.findUnique.mockResolvedValue({
        id: CASAL_ID,
        paroquiaId: 'outra-paroquia',
      });
      await expect(service.update(CASAL_ID, {} as any, PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.fichaCasal.update).not.toHaveBeenCalled();
    });
  });

  describe('historicoEquipes', () => {
    it('lista as alocações do casal, mais recentes primeiro', async () => {
      await service.historicoEquipes(CASAL_ID, PAROQUIA_ID);
      expect(prisma.alocacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fichaCasalId: CASAL_ID },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('rejeita com 404 se o casal é de outra paróquia', async () => {
      prisma.fichaCasal.findUnique.mockResolvedValue({
        id: CASAL_ID,
        paroquiaId: 'outra-paroquia',
      });
      await expect(service.historicoEquipes(CASAL_ID, PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
