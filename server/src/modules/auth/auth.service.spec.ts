import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

const USUARIO_ID = 'usuario-1';

function criarPrismaMock() {
  return {
    usuario: {
      findUnique: jest.fn(),
    },
  };
}

function criarJwtServiceMock() {
  return { signAsync: jest.fn().mockResolvedValue('token-fake') };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof criarPrismaMock>;
  let jwtService: ReturnType<typeof criarJwtServiceMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    jwtService = criarJwtServiceMock();
    service = new AuthService(prisma as unknown as PrismaService, jwtService as any);
  });

  describe('validarUsuario', () => {
    it('rejeita login inexistente', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.validarUsuario('ninguem', 'senha')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejeita usuário inativo', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: USUARIO_ID,
        ativo: false,
        senhaHash: 'hash',
      });
      await expect(service.validarUsuario('login', 'senha')).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita senha errada', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      prisma.usuario.findUnique.mockResolvedValue({ id: USUARIO_ID, ativo: true, senhaHash });
      await expect(service.validarUsuario('login', 'senha-errada')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('aceita senha correta e devolve o usuário', async () => {
      const senhaHash = await bcrypt.hash('senha-certa', 10);
      const usuario = {
        id: USUARIO_ID,
        ativo: true,
        senhaHash,
        role: 'PAROQUIA',
        paroquiaId: 'p1',
      };
      prisma.usuario.findUnique.mockResolvedValue(usuario);
      await expect(service.validarUsuario('login', 'senha-certa')).resolves.toEqual(usuario);
    });
  });

  describe('login', () => {
    it('assina um JWT com sub/role/paroquiaId', async () => {
      await service.login({ id: USUARIO_ID, role: 'PAROQUIA', paroquiaId: 'p1' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: USUARIO_ID,
        role: 'PAROQUIA',
        paroquiaId: 'p1',
      });
    });
  });

  describe('me', () => {
    it('lança UnauthorizedException se o usuário não existir mais', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.me(USUARIO_ID)).rejects.toThrow(UnauthorizedException);
    });

    it('devolve os dados públicos do usuário', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: USUARIO_ID,
        login: 'paroquia-dev',
        role: 'PAROQUIA',
        nome: null,
        paroquia: { id: 'p1', nome: 'Paróquia Dev' },
      });
      await expect(service.me(USUARIO_ID)).resolves.toEqual({
        id: USUARIO_ID,
        login: 'paroquia-dev',
        role: 'PAROQUIA',
        nome: null,
        paroquia: { id: 'p1', nome: 'Paróquia Dev' },
      });
    });
  });
});
