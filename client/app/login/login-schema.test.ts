import { describe, expect, it } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  it('aceita e-mail e senha preenchidos', () => {
    const resultado = loginSchema.safeParse({ login: 'paroquia@gmail.com', senha: 'senha123' });
    expect(resultado.success).toBe(true);
  });

  it('rejeita e-mail vazio', () => {
    const resultado = loginSchema.safeParse({ login: '  ', senha: 'senha123' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.login).toEqual(['Informe o e-mail']);
    }
  });

  it('aceita senha vazia (primeiro acesso: a conta ainda não tem senha)', () => {
    const resultado = loginSchema.safeParse({ login: 'paroquia@gmail.com', senha: '' });
    expect(resultado.success).toBe(true);
  });
});
