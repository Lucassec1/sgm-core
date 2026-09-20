import { describe, expect, it } from 'vitest';
import { trocarSenhaSchema } from './trocar-senha-dialog';

describe('trocarSenhaSchema', () => {
  it('aceita quando a nova senha e a confirmação coincidem e têm 8+ caracteres', () => {
    const resultado = trocarSenhaSchema.safeParse({
      senhaAtual: 'atual123',
      senhaNova: 'novaSenha1',
      confirmarSenha: 'novaSenha1',
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita quando nova senha e confirmação não coincidem, apontando o erro em confirmarSenha', () => {
    const resultado = trocarSenhaSchema.safeParse({
      senhaAtual: 'atual123',
      senhaNova: 'novaSenha1',
      confirmarSenha: 'outraSenha',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const erros = resultado.error.flatten().fieldErrors;
      expect(erros.confirmarSenha).toEqual(['As senhas não coincidem']);
    }
  });

  it('rejeita nova senha com menos de 8 caracteres', () => {
    const resultado = trocarSenhaSchema.safeParse({
      senhaAtual: 'atual123',
      senhaNova: 'curta',
      confirmarSenha: 'curta',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.senhaNova).toEqual([
        'A nova senha precisa ter pelo menos 8 caracteres',
      ]);
    }
  });

  it('rejeita senha atual vazia', () => {
    const resultado = trocarSenhaSchema.safeParse({
      senhaAtual: '',
      senhaNova: 'novaSenha1',
      confirmarSenha: 'novaSenha1',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.senhaAtual).toEqual(['Informe a senha atual']);
    }
  });
});
