import { RoleUsuario } from '@prisma/client';

// Formato de `request.user`, populado pela JwtStrategy a partir do payload do JWT.
export interface UsuarioAutenticado {
  id: string;
  role: RoleUsuario;
  paroquiaId: string | null;
  // Madrinha atuando como afilhada durante a implantação: `paroquiaId` é a afilhada e estes dois
  // dizem de onde veio a sessão (conferido a cada requisição na JwtStrategy).
  paroquiaOrigemId?: string;
  implantacaoId?: string;
}
