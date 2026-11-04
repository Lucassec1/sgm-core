import { ConflictException, NotFoundException } from '@nestjs/common';
import { ParoquiasService } from './paroquias.service';
import { PrismaService } from '../../prisma/prisma.service';

function criarPrismaMock() {
  const tx = {
    paroquia: { create: jest.fn().mockResolvedValue({ id: 'p1', nome: 'Paróquia X' }) },
    usuario: { create: jest.fn() },
  };
  return {
    tx,
    usuario: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paroquia: { findMany: jest.fn() },
    tokenRedefinicaoSenha: { deleteMany: jest.fn() },
    // callback (create) roda num client transacional fake; array só aguarda tudo
    $transaction: jest.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(tx))),
  };
}

describe('ParoquiasService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let service: ParoquiasService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new ParoquiasService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('diz se a conta aguarda o primeiro acesso, sem nunca devolver o hash da senha', async () => {
      prisma.paroquia.findMany.mockResolvedValue([
        {
          id: 'p1',
          nome: 'Paróquia X',
          usuarios: [{ id: 'u1', login: 'x@gmail.com', ativo: true, senhaHash: null }],
        },
        {
          id: 'p2',
          nome: 'Paróquia Y',
          usuarios: [{ id: 'u2', login: 'y@gmail.com', ativo: true, senhaHash: 'hash' }],
        },
      ]);

      const resultado = await service.findAll();

      expect(resultado).toEqual([
        {
          id: 'p1',
          nome: 'Paróquia X',
          usuarios: [
            { id: 'u1', login: 'x@gmail.com', ativo: true, aguardandoPrimeiroAcesso: true },
          ],
        },
        {
          id: 'p2',
          nome: 'Paróquia Y',
          usuarios: [
            { id: 'u2', login: 'y@gmail.com', ativo: true, aguardandoPrimeiroAcesso: false },
          ],
        },
      ]);
      expect(JSON.stringify(resultado)).not.toContain('hash');
    });
  });

  describe('create', () => {
    it('rejeita e-mail já cadastrado (sem diferenciar maiúsculas)', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: 'existente' });
      await expect(service.create({ nome: 'X', email: 'X@Gmail.com' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
        where: { login: { equals: 'x@gmail.com', mode: 'insensitive' } },
      });
    });

    it('cria a paróquia e a conta com o e-mail normalizado e SEM senha', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);

      const paroquia = await service.create({
        nome: ' Paróquia X ',
        email: ' ParoquiaX@Gmail.com ',
      });

      expect(paroquia).toEqual({ id: 'p1', nome: 'Paróquia X' });
      expect(prisma.tx.paroquia.create).toHaveBeenCalledWith({ data: { nome: 'Paróquia X' } });
      const { data } = prisma.tx.usuario.create.mock.calls[0][0];
      expect(data).toEqual({ login: 'paroquiax@gmail.com', role: 'PAROQUIA', paroquiaId: 'p1' });
      expect(data.senhaHash).toBeUndefined();
    });
  });

  describe('alterarEmail', () => {
    it('lança NotFoundException se a paróquia não tiver conta', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);
      await expect(service.alterarEmail('p1', 'novo@gmail.com')).rejects.toThrow(NotFoundException);
    });

    it('rejeita e-mail que já é de outra conta', async () => {
      prisma.usuario.findFirst
        .mockResolvedValueOnce({ id: 'u1', login: 'paroquia-antiga' })
        .mockResolvedValueOnce({ id: 'u2' });
      await expect(service.alterarEmail('p1', 'outra@gmail.com')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('troca o login pelo e-mail (migra conta antiga) e invalida links pendentes', async () => {
      prisma.usuario.findFirst
        .mockResolvedValueOnce({ id: 'u1', login: 'paroquia-antiga' })
        .mockResolvedValueOnce(null);

      await service.alterarEmail('p1', ' Nova@Gmail.com ');

      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { login: 'nova@gmail.com' },
      });
      expect(prisma.tokenRedefinicaoSenha.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId: 'u1' },
      });
    });
  });

  describe('redefinirAcesso', () => {
    it('apaga a senha, derruba sessões e volta a conta pro primeiro acesso', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: 'u1' });

      await expect(service.redefinirAcesso('p1')).resolves.toEqual({ ok: true });

      const { where, data } = prisma.usuario.update.mock.calls[0][0];
      expect(where).toEqual({ id: 'u1' });
      expect(data).toEqual({ senhaHash: null, ativo: true, senhaAlteradaEm: expect.any(Date) });
      expect(prisma.tokenRedefinicaoSenha.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId: 'u1' },
      });
    });
  });
});
