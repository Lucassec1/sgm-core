import { RoleUsuario } from '@prisma/client';

// Formato de `request.user`, populado pela JwtStrategy a partir do payload do JWT.
export interface UsuarioAutenticado {
  id: string;
  role: RoleUsuario;
  paroquiaId: string | null;
}
