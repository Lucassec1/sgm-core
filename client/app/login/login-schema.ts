import { z } from 'zod';

// Login único (docs/producao.md, bloqueador #3) — mesmo formulário pra conta de paróquia e de
// Conselho; o backend decide pelo `role` de quem logou, o client só redireciona pro lugar
// certo depois (ver docs/regras-imutaveis.md, R7/R8).
export const loginSchema = z.object({
  login: z.string().min(1, 'Informe o usuário'),
  senha: z.string().min(1, 'Informe a senha'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
