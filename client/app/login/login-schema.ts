import { z } from 'zod';

// Login único (docs/producao.md, bloqueador #3) — mesmo formulário pra conta de paróquia e de
// Conselho; o backend decide pelo `role` de quem logou, o client só redireciona pro lugar
// certo depois (ver docs/regras-imutaveis.md, R7/R8). Login = e-mail da paróquia. Senha pode
// ir vazia: no primeiro acesso a conta ainda não tem senha, e o server responde mandando o
// link de criar senha (código PRIMEIRO_ACESSO).
export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Informe o e-mail'),
  senha: z.string(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
