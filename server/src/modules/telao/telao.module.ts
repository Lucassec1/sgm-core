import { Module } from '@nestjs/common';
import { TelaoController } from './telao.controller';
import { TelaoService } from './telao.service';

@Module({
  controllers: [TelaoController],
  providers: [TelaoService],
})
export class TelaoModule {}
