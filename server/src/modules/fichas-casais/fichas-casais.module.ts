import { Module } from '@nestjs/common';
import { FichasCasaisController } from './fichas-casais.controller';
import { FichasCasaisService } from './fichas-casais.service';

@Module({
  controllers: [FichasCasaisController],
  providers: [FichasCasaisService],
  exports: [FichasCasaisService],
})
export class FichasCasaisModule {}
