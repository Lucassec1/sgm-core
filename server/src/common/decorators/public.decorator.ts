import { SetMetadata } from '@nestjs/common';

// Marca uma rota como isenta do JwtAuthGuard global (ver app.module.ts) — usado hoje só pelo
// próprio módulo Auth (login/logout) e pelo módulo Telão (endpoints públicos e reduzidos).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
