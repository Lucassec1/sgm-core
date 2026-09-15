import { SetMetadata } from '@nestjs/common';
import { RoleUsuario } from '@prisma/client';

// Restringe uma rota a uma role específica (ex.: @Roles('CONSELHO')) — checado pelo RolesGuard.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleUsuario[]) => SetMetadata(ROLES_KEY, roles);
