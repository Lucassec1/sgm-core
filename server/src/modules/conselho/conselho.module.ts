import { Module } from '@nestjs/common';
import { ConselhoMontagensController } from './conselho-montagens.controller';
import { ConselhoService } from './conselho.service';

@Module({
  controllers: [ConselhoMontagensController],
  providers: [ConselhoService],
})
export class ConselhoModule {}
