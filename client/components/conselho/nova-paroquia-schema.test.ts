import { describe, expect, it } from 'vitest';
import { novaParoquiaSchema } from './paroquia-conta';

describe('novaParoquiaSchema', () => {
  it('aceita nome e e-mail válidos', () => {
    expect(
      novaParoquiaSchema.safeParse({ nome: 'Paróquia São José', email: 'psj@gmail.com' }).success,
    ).toBe(true);
  });

  it('rejeita nome vazio e e-mail inválido, com mensagens em português', () => {
    const r = novaParoquiaSchema.safeParse({ nome: '  ', email: 'psj' });
    expect(r.success).toBe(false);
    const erros = r.error?.flatten().fieldErrors;
    expect(erros?.nome).toEqual(['Informe o nome da paróquia']);
    expect(erros?.email).toEqual(['E-mail inválido']);
  });
});
