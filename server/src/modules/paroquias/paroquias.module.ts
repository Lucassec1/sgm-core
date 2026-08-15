import { Module } from '@nestjs/common';
import { ParoquiasController } from './paroquias.controller';
import { ParoquiasService } from './paroquias.service';

@Module({
  controllers: [ParoquiasController],
  providers: [ParoquiasService],
  exports: [ParoquiasService],
})
export class ParoquiasModule {}
