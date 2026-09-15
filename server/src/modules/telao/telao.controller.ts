import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TelaoService } from './telao.service';
import { Public } from '../../common/decorators/public.decorator';

// Público de propósito (ver telao.service.ts) — isento do guard global de JWT.
@ApiTags('telao')
@Public()
@Controller('telao/montagens')
export class TelaoController {
  constructor(private readonly telaoService: TelaoService) {}

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.telaoService.obterMontagem(id);
  }
}
