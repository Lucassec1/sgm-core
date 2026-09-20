import { NotFoundException } from '@nestjs/common';
import { MontagemScopeGuard } from './montagem-scope.guard';
import { PrismaService } from '../../prisma/prisma.service';

function criarPrismaMock() {
  return { montagem: { findUnique: jest.fn() } };
}

function contexto(params: Record<string, string>, user?: { paroquiaId?: string | null }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ params, user }) }),
  } as any;
}

describe('MontagemScopeGuard', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let guard: MontagemScopeGuard;

  beforeEach(() => {
    prisma = criarPrismaMock();
    guard = new MontagemScopeGuard(prisma as unknown as PrismaService);
  });

  it('deixa passar quando a rota não tem :montagemId', async () => {
    await expect(guard.canActivate(contexto({}, { paroquiaId: 'p1' }))).resolves.toBe(true);
    expect(prisma.montagem.findUnique).not.toHaveBeenCalled();
  });

  it('bloqueia com 404 quando não há paroquiaId (conta Conselho)', async () => {
    await expect(
      guard.canActivate(contexto({ montagemId: 'm1' }, { paroquiaId: null })),
    ).rejects.toThrow(NotFoundException);
  });

  it('bloqueia com 404 quando a montagem não existe', async () => {
    prisma.montagem.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(contexto({ montagemId: 'm1' }, { paroquiaId: 'p1' })),
    ).rejects.toThrow(NotFoundException);
  });

  it('bloqueia com 404 quando a montagem é de outra paróquia', async () => {
    prisma.montagem.findUnique.mockResolvedValue({ id: 'm1', paroquiaId: 'outra' });
    await expect(
      guard.canActivate(contexto({ montagemId: 'm1' }, { paroquiaId: 'p1' })),
    ).rejects.toThrow(NotFoundException);
  });

  it('deixa passar quando a montagem pertence à paróquia do usuário', async () => {
    prisma.montagem.findUnique.mockResolvedValue({ id: 'm1', paroquiaId: 'p1' });
    await expect(
      guard.canActivate(contexto({ montagemId: 'm1' }, { paroquiaId: 'p1' })),
    ).resolves.toBe(true);
  });
});
