import { SetMetadata } from '@nestjs/common';

// Marca uma rota como isenta do JwtAuthGuard global (ver app.module.ts) — usado hoje só pelo
// próprio módulo Auth (login/logout, esqueci/redefinir senha) e pelo health check.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
