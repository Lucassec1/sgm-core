import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AlocacoesService } from './alocacoes.service';
import { CreateAlocacaoDto } from './dto/create-alocacao.dto';
import { UpdateAlocacaoDto } from './dto/update-alocacao.dto';

// TODO: aplicar JwtAuthGuard + ParoquiaScopeGuard aqui quando o módulo Auth existir.
@Controller('montagens/:montagemId/alocacoes')
export class AlocacoesController {
  constructor(private readonly alocacoesService: AlocacoesService) {}

  @Post()
  create(@Param('montagemId') montagemId: string, @Body() dto: CreateAlocacaoDto) {
    return this.alocacoesService.create(montagemId, dto);
  }

  @Get()
  findAll(@Param('montagemId') montagemId: string) {
    return this.alocacoesService.findAll(montagemId);
  }

  @Get(':id')
  findOne(@Param('montagemId') montagemId: string, @Param('id') id: string) {
    return this.alocacoesService.findOne(montagemId, id);
  }

  @Patch(':id')
  update(
    @Param('montagemId') montagemId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAlocacaoDto,
  ) {
    return this.alocacoesService.update(montagemId, id, dto);
  }

  @Delete(':id')
  remove(@Param('montagemId') montagemId: string, @Param('id') id: string) {
    return this.alocacoesService.remove(montagemId, id);
  }
}
