import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ParoquiaAtual } from './paroquia-atual.decorator';

// `createParamDecorator` não expõe a factory diretamente — precisa extraí-la da metadata que
// o Nest anexa à classe/método decorados, mesmo padrão recomendado na doc do Nest pra testar
// custom decorators sem subir um contexto HTTP de verdade.
function obterFactory(): (data: unknown, ctx: ExecutionContext) => string {
  class TesteDecorator {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metodo(@ParoquiaAtual() _valor: string) {}
  }
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TesteDecorator, 'metodo');
  const chave = Object.keys(metadata)[0];
  return metadata[chave].factory;
}

function contexto(user: { paroquiaId?: string | null } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('ParoquiaAtual decorator', () => {
  const factory = obterFactory();

  it('devolve o paroquiaId do usuário autenticado', () => {
    expect(factory(undefined, contexto({ paroquiaId: 'p1' }))).toBe('p1');
  });

  it('lança ForbiddenException quando paroquiaId é null (conta Conselho)', () => {
    expect(() => factory(undefined, contexto({ paroquiaId: null }))).toThrow(ForbiddenException);
  });

  it('lança ForbiddenException quando não há usuário autenticado', () => {
    expect(() => factory(undefined, contexto(undefined))).toThrow(ForbiddenException);
  });
});
