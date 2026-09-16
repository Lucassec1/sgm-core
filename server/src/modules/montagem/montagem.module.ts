import { Module } from '@nestjs/common';
import { EquipesController } from './equipes.controller';
import { EquipesService } from './equipes.service';
import { MontagensController } from './montagens.controller';
import { MontagensService } from './montagens.service';
import { AlocacoesController } from './alocacoes.controller';
import { AlocacoesService } from './alocacoes.service';
import { ListaSubstituicaoController } from './lista-substituicao.controller';
import { ListaSubstituicaoService } from './lista-substituicao.service';
import { LogAtividadeService } from './log-atividade.service';
import { QuadrantesController } from './quadrantes.controller';
import { QuadrantesService } from './quadrantes.service';

@Module({
  controllers: [
    EquipesController,
    MontagensController,
    AlocacoesController,
    ListaSubstituicaoController,
    QuadrantesController,
  ],
  providers: [
    EquipesService,
    MontagensService,
    AlocacoesService,
    ListaSubstituicaoService,
    LogAtividadeService,
    QuadrantesService,
  ],
  exports: [
    EquipesService,
    MontagensService,
    AlocacoesService,
    ListaSubstituicaoService,
    LogAtividadeService,
  ],
})
export class MontagemModule {}
