import { Module } from '@nestjs/common';
import { ParoquiasModule } from '../paroquias/paroquias.module';
import { ConselhoImplantacoesController } from './conselho-implantacoes.controller';
import { ImplantacoesService } from './implantacoes.service';

@Module({
  imports: [ParoquiasModule],
  controllers: [ConselhoImplantacoesController],
  providers: [ImplantacoesService],
  exports: [ImplantacoesService],
})
export class ImplantacaoModule {}
