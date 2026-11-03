import { describe, expect, it } from 'vitest';
import { emailRecuperacaoSchema } from './email-recuperacao-dialog';

describe('emailRecuperacaoSchema', () => {
  it('aceita e-mail válido com a senha atual', () => {
    expect(
      emailRecuperacaoSchema.safeParse({ email: ' secretaria@paroquia.org ', senhaAtual: 'x' })
        .success,
    ).toBe(true);
  });

  it('rejeita e-mail inválido', () => {
    const r = emailRecuperacaoSchema.safeParse({ email: 'secretaria', senhaAtual: 'x' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('E-mail inválido');
  });

  it('exige a senha atual', () => {
    expect(emailRecuperacaoSchema.safeParse({ email: 'a@b.org', senhaAtual: '' }).success).toBe(
      false,
    );
  });
});
