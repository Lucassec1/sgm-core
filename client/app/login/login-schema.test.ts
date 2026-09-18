import { describe, expect, it } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  it('aceita login e senha preenchidos', () => {
    const resultado = loginSchema.safeParse({ login: 'paroquia-dev', senha: 'senha123' });
    expect(resultado.success).toBe(true);
  });

  it('rejeita login vazio', () => {
    const resultado = loginSchema.safeParse({ login: '', senha: 'senha123' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.login).toEqual(['Informe o usuário']);
    }
  });

  it('rejeita senha vazia', () => {
    const resultado = loginSchema.safeParse({ login: 'paroquia-dev', senha: '' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.senha).toEqual(['Informe a senha']);
    }
  });
});
