import { autorDoLog } from './autor-log';

describe('autorDoLog', () => {
  it('sem atuação, mantém o autor informado (texto livre, como hoje)', () => {
    expect(autorDoLog({ id: 'u1', role: 'PAROQUIA', paroquiaId: 'p1' }, 'Equipe')).toBe('Equipe');
  });

  it('madrinha atuando pela afilhada: o servidor define o autor', () => {
    expect(
      autorDoLog(
        {
          id: 'u1',
          role: 'PAROQUIA',
          paroquiaId: 'a1',
          paroquiaOrigemId: 'p1',
          implantacaoId: 'i1',
        },
        'qualquer coisa',
      ),
    ).toBe('Madrinha (atuando pela afilhada)');
  });
});
