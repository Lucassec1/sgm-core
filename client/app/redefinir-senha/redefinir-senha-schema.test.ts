import { describe, expect, it } from 'vitest';
import { redefinirSenhaSchema, tokenDoFragmento } from './redefinir-senha-schema';

describe('redefinirSenhaSchema', () => {
  it('aceita senha de 8+ caracteres confirmada', () => {
    expect(
      redefinirSenhaSchema.safeParse({ senhaNova: 'novaSenha1', confirmarSenha: 'novaSenha1' })
        .success,
    ).toBe(true);
  });

  it('rejeita confirmação diferente, apontando o erro em confirmarSenha', () => {
    const r = redefinirSenhaSchema.safeParse({ senhaNova: 'novaSenha1', confirmarSenha: 'outra' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(['confirmarSenha']);
  });

  it('rejeita senha curta', () => {
    expect(
      redefinirSenhaSchema.safeParse({ senhaNova: '123', confirmarSenha: '123' }).success,
    ).toBe(false);
  });
});

describe('tokenDoFragmento', () => {
  it('lê o token do #token=...', () => {
    expect(tokenDoFragmento('#token=abc_DEF-123')).toBe('abc_DEF-123');
  });

  it('devolve null sem token', () => {
    expect(tokenDoFragmento('')).toBeNull();
    expect(tokenDoFragmento('#token=')).toBeNull();
    expect(tokenDoFragmento('#outra=1')).toBeNull();
  });
});
