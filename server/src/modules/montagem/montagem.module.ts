import { Module } from '@nestjs/common';
import { EquipesController } from './equipes.controller';
import { EquipesService } from './equipes.service';
import { MontagensController } from './montagens.controller';
import { MontagensService } from './montagens.service';
import { AlocacoesController } from './alocacoes.controller';
import { AlocacoesService } from './alocacoes.service';

@Module({
  controllers: [EquipesController, MontagensController, AlocacoesController],
  providers: [EquipesService, MontagensService, AlocacoesService],
  exports: [EquipesService, MontagensService, AlocacoesService],
})
export class MontagemModule {}
