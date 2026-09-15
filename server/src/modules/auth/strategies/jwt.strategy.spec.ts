import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('valida o payload e devolve o formato de request.user', () => {
    const config = { getOrThrow: jest.fn().mockReturnValue('segredo-fake') } as unknown as ConfigService;
    const strategy = new JwtStrategy(config);

    const resultado = strategy.validate({ sub: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' });

    expect(resultado).toEqual({ id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' });
  });
});
