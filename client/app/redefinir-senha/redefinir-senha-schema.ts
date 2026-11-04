import { z } from 'zod';

export const redefinirSenhaSchema = z
  .object({
    senhaNova: z.string().min(8, 'A nova senha precisa ter pelo menos 8 caracteres'),
    confirmarSenha: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.senhaNova === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

export type RedefinirSenhaFormValues = z.infer<typeof redefinirSenhaSchema>;

// O link do e-mail traz o token no fragmento (#token=...), não na query string — ver
// AuthService.solicitarRedefinicao no server.
export function tokenDoFragmento(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token');
  return token || null;
}
