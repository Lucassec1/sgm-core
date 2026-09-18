import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

function criarStrategy() {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('segredo-fake'),
  } as unknown as ConfigService;
  return new JwtStrategy(config);
}

describe('JwtStrategy', () => {
  it('valida o payload e devolve o formato de request.user', () => {
    const strategy = criarStrategy();

    const resultado = strategy.validate({ sub: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' });

    expect(resultado).toEqual({ id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' });
  });

  describe('extractFromCookie (via passport-jwt jwtFromRequest)', () => {
    it('lê o token do cookie sgm_token', () => {
      const strategy = criarStrategy();
      const extractor = (strategy as unknown as { _jwtFromRequest: (req: unknown) => unknown })
        ._jwtFromRequest;

      expect(extractor({ cookies: { sgm_token: 'token-fake' } })).toBe('token-fake');
    });

    it('devolve null quando não há cookie sgm_token', () => {
      const strategy = criarStrategy();
      const extractor = (strategy as unknown as { _jwtFromRequest: (req: unknown) => unknown })
        ._jwtFromRequest;

      expect(extractor({ cookies: {} })).toBeNull();
      expect(extractor({})).toBeNull();
    });
  });
});
