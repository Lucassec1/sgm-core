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
}));

const FICHA_ID = 'ficha-1';
const PAROQUIA_ID = 'paroquia-1';

function criarPrismaMock() {
  return {
    ficha: {
      findUnique: jest.fn().mockResolvedValue({ id: FICHA_ID, paroquiaId: PAROQUIA_ID }),
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
      await expect(service.uploadFoto(FICHA_ID, undefined, PAROQUIA_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(fotoStorage.salvarFoto).not.toHaveBeenCalled();
    });

    it('rejeita formato que não é JPEG/PNG/WEBP', async () => {
      await expect(
        service.uploadFoto(FICHA_ID, arquivoFake({ mimetype: 'application/pdf' }), PAROQUIA_ID),
      ).rejects.toThrow(BadRequestException);
      expect(fotoStorage.salvarFoto).not.toHaveBeenCalled();
    });

    it('rejeita arquivo acima de 5 MB', async () => {
      await expect(
        service.uploadFoto(
          FICHA_ID,
          arquivoFake({ size: fotoStorage.MAX_FOTO_BYTES + 1 }),
          PAROQUIA_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(fotoStorage.salvarFoto).not.toHaveBeenCalled();
    });

    it('rejeita quando a ficha não existe', async () => {
      prisma.ficha.findUnique.mockResolvedValue(null);
      await expect(service.uploadFoto(FICHA_ID, arquivoFake(), PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('salva o arquivo e grava a URL de acesso na ficha', async () => {
      await service.uploadFoto(FICHA_ID, arquivoFake(), PAROQUIA_ID);

      expect(fotoStorage.salvarFoto).toHaveBeenCalledWith(
        expect.any(String),
        FICHA_ID,
        'image/jpeg',
        expect.any(Buffer),
      );
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
      expect(prisma.ficha.update).toHaveBeenCalledWith({
        where: { id: FICHA_ID },
        data: { fotoUrl: null },
      });
    });
  });

  describe('streamFoto', () => {
    it('rejeita com 404 quando a ficha não tem foto', async () => {
      (fotoStorage.encontrarFoto as jest.Mock).mockResolvedValue(null);
      await expect(service.streamFoto(FICHA_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('retorna o stream e o mimetype quando a foto existe', async () => {
      (fotoStorage.encontrarFoto as jest.Mock).mockResolvedValue({
        stream: 'stream-fake',
        mimetype: 'image/jpeg',
      });

      const resultado = await service.streamFoto(FICHA_ID, PAROQUIA_ID);

      expect(resultado).toEqual({ stream: 'stream-fake', mimetype: 'image/jpeg' });
    });
  });

  describe('remove', () => {
    it('remove o arquivo de foto junto com a ficha', async () => {
      await service.remove(FICHA_ID, PAROQUIA_ID);

      expect(fotoStorage.removerFoto).toHaveBeenCalledWith(expect.any(String), FICHA_ID);
      expect(prisma.ficha.delete).toHaveBeenCalledWith({ where: { id: FICHA_ID } });
    });

    it('rejeita com 404 se a ficha não pertence à paróquia de quem pediu', async () => {
      prisma.ficha.findUnique.mockResolvedValue({ id: FICHA_ID, paroquiaId: 'outra-paroquia' });
      await expect(service.remove(FICHA_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.ficha.delete).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('grava a ficha com o paroquiaId recebido e normaliza a data de nascimento', async () => {
      const dto = { nomeCompleto: 'Fulano', dataNascimento: '2000-01-15' } as any;
      await service.create(dto, PAROQUIA_ID);

      expect(prisma.ficha.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nomeCompleto: 'Fulano',
          paroquiaId: PAROQUIA_ID,
          dataNascimento: new Date('2000-01-15'),
        }),
      });
    });
  });

  describe('findAll', () => {
    it('filtra por paroquiaId, nome, numeroEncontro e situacao', async () => {
      await service.findAll(
        { nome: 'Ana', numeroEncontro: 5, situacao: 'ATIVA' } as any,
        PAROQUIA_ID,
      );

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            paroquiaId: PAROQUIA_ID,
            nomeCompleto: { contains: 'Ana', mode: 'insensitive' },
            numeroEncontro: 5,
            situacao: 'ATIVA',
          },
        }),
      );
    });

    it('pagina com page/pageSize default e devolve o total', async () => {
      prisma.ficha.count.mockResolvedValue(42);
      const resultado = await service.findAll({} as any, PAROQUIA_ID);

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(resultado).toEqual({ items: [], total: 42, page: 1, pageSize: 20 });
    });
  });

  describe('listNumerosEncontro', () => {
    it('devolve só os números de encontro, distintos e ordenados', async () => {
      prisma.ficha.findMany.mockResolvedValue([{ numeroEncontro: 5 }, { numeroEncontro: 3 }]);
      await expect(service.listNumerosEncontro(PAROQUIA_ID)).resolves.toEqual([5, 3]);
      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { paroquiaId: PAROQUIA_ID },
          distinct: ['numeroEncontro'],
        }),
      );
    });
  });

  describe('exportCsv', () => {
    it('monta um CSV com uma linha por ficha da paróquia', async () => {
      prisma.ficha.findMany.mockResolvedValue([
        {
          nomeCompleto: 'Fulano',
          sexo: 'RAPAZ',
          dataNascimento: new Date('2000-01-15'),
          telefone: '88999999999',
          email: 'fulano@example.com',
          cidade: 'Crato',
          numeroEncontro: 5,
          corCirculo: 'AZUL',
          situacao: 'ATIVA',
          termoAssinado: true,
        },
      ]);

      const csv = await service.exportCsv(PAROQUIA_ID);

      expect(prisma.ficha.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paroquiaId: PAROQUIA_ID } }),
      );
      expect(csv).toContain('Fulano');
      expect(csv).toContain('Sim');
    });
  });

  describe('findOne', () => {
    it('lança NotFoundException se a ficha não existe', async () => {
      prisma.ficha.findUnique.mockResolvedValue(null);
      await expect(service.findOne(FICHA_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException (não Forbidden) se a ficha é de outra paróquia', async () => {
      prisma.ficha.findUnique.mockResolvedValue({ id: FICHA_ID, paroquiaId: 'outra-paroquia' });
      await expect(service.findOne(FICHA_ID, PAROQUIA_ID)).rejects.toThrow(NotFoundException);
    });

    it('devolve a ficha quando pertence à paróquia de quem pediu', async () => {
      const ficha = { id: FICHA_ID, paroquiaId: PAROQUIA_ID };
      prisma.ficha.findUnique.mockResolvedValue(ficha);
      await expect(service.findOne(FICHA_ID, PAROQUIA_ID)).resolves.toEqual(ficha);
    });

    it('não filtra por paroquia quando ele não é informado', async () => {
      const ficha = { id: FICHA_ID, paroquiaId: 'qualquer-paroquia' };
      prisma.ficha.findUnique.mockResolvedValue(ficha);
      await expect(service.findOne(FICHA_ID)).resolves.toEqual(ficha);
    });
  });

  describe('update', () => {
    it('atualiza a ficha e normaliza a data de nascimento quando informada', async () => {
      await service.update(FICHA_ID, { dataNascimento: '1999-05-20' } as any, PAROQUIA_ID);
      expect(prisma.ficha.update).toHaveBeenCalledWith({
        where: { id: FICHA_ID },
        data: expect.objectContaining({ dataNascimento: new Date('1999-05-20') }),
      });
    });

    it('rejeita com 404 se a ficha é de outra paróquia', async () => {
      prisma.ficha.findUnique.mockResolvedValue({ id: FICHA_ID, paroquiaId: 'outra-paroquia' });
      await expect(service.update(FICHA_ID, {} as any, PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.ficha.update).not.toHaveBeenCalled();
    });
  });

  describe('historicoEquipes', () => {
    it('lista as alocações da ficha, mais recentes primeiro', async () => {
      await service.historicoEquipes(FICHA_ID, PAROQUIA_ID);
      expect(prisma.alocacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fichaId: FICHA_ID }, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('rejeita com 404 se a ficha é de outra paróquia', async () => {
      prisma.ficha.findUnique.mockResolvedValue({ id: FICHA_ID, paroquiaId: 'outra-paroquia' });
      await expect(service.historicoEquipes(FICHA_ID, PAROQUIA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
