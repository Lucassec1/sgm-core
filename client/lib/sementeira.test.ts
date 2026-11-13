import { describe, expect, it } from 'vitest';
import { marcaSementeira } from './sementeira';

const sementeiraDe = {
  id: 'i1',
  fase: 'IMPLANTACAO' as const,
  madrinha: { id: 'm', nome: 'Paróquia Y' },
  afilhada: { id: 'a', nome: 'Paróquia X' },
};

describe('marcaSementeira', () => {
  it('na madrinha (antes de transferir): de qual afilhada é', () => {
    expect(marcaSementeira({ paroquiaId: 'm', sementeiraDe })).toBe('Sementeira de Paróquia X');
  });

  it('na afilhada (depois de transferir): onde vivenciou', () => {
    expect(marcaSementeira({ paroquiaId: 'a', sementeiraDe })).toBe(
      'Vivenciou como sementeira na Paróquia Y',
    );
  });

  it('ficha comum: nada', () => {
    expect(marcaSementeira({ paroquiaId: 'm', sementeiraDe: null })).toBeNull();
  });
});
