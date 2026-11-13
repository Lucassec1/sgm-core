import { Module } from '@nestjs/common';
import { ParoquiasModule } from '../paroquias/paroquias.module';
import { ConselhoImplantacoesController } from './conselho-implantacoes.controller';
import { ImplantacoesService } from './implantacoes.service';
import { ImplantacoesParoquiaController } from './implantacoes-paroquia.controller';

@Module({
  imports: [ParoquiasModule],
  controllers: [ConselhoImplantacoesController, ImplantacoesParoquiaController],
  providers: [ImplantacoesService],
  exports: [ImplantacoesService],
})
export class ImplantacaoModule {}
