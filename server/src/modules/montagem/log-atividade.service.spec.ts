import { LogAtividadeService } from './log-atividade.service';
import { PrismaService } from '../../prisma/prisma.service';

function criarPrismaMock() {
  return {
    logAtividade: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

describe('LogAtividadeService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let service: LogAtividadeService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new LogAtividadeService(prisma as unknown as PrismaService);
  });

  describe('registrar', () => {
    it('grava usuário, ação e detalhes usando o PrismaService por padrão', () => {
      service.registrar('montagem-1', 'Ana', 'CRIOU', 'detalhe');
      expect(prisma.logAtividade.create).toHaveBeenCalledWith({
        data: { montagemId: 'montagem-1', usuario: 'Ana', acao: 'CRIOU', detalhes: 'detalhe' },
      });
    });

    it('usa "sistema" quando usuario é undefined ou só espaços', () => {
      service.registrar('montagem-1', '   ', 'CRIOU');
      expect(prisma.logAtividade.create).toHaveBeenCalledWith({
        data: {
          montagemId: 'montagem-1',
          usuario: 'sistema',
          acao: 'CRIOU',
          detalhes: undefined,
        },
      });
    });

    it('usa o tx recebido em vez do PrismaService, quando informado', () => {
      const tx = { logAtividade: { create: jest.fn() } };
      service.registrar('montagem-1', 'Ana', 'CRIOU', undefined, tx as any);
      expect(tx.logAtividade.create).toHaveBeenCalled();
      expect(prisma.logAtividade.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('lista os logs da montagem, mais recentes primeiro', () => {
      service.listar('montagem-1');
      expect(prisma.logAtividade.findMany).toHaveBeenCalledWith({
        where: { montagemId: 'montagem-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
