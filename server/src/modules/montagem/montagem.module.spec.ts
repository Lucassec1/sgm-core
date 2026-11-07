import { Test } from '@nestjs/testing';
import { MontagemModule } from './montagem.module';
import { MontagensController } from './montagens.controller';
import { SugestoesMontagemService } from './sugestoes-montagem.service';
import { ResumoMontagemService } from './resumo-montagem.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';

// Os specs dos services instanciam cada um à mão — um provider esquecido no módulo só
// apareceria com o app no ar (500 em resumo/candidatos, que o E2E não exercita). Este teste
// monta o módulo de verdade, sem banco.
describe('MontagemModule', () => {
  it('resolve o controller de montagens com os três services', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [PrismaModule, MontagemModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(MontagensController)).toBeDefined();
    expect(moduleRef.get(SugestoesMontagemService)).toBeDefined();
    expect(moduleRef.get(ResumoMontagemService)).toBeDefined();
  });
});
