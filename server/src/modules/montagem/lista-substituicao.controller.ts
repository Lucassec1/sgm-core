import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ListaSubstituicaoService } from './lista-substituicao.service';
import { CreateItemListaSubstituicaoDto } from './dto/create-item-lista-substituicao.dto';

// TODO: aplicar JwtAuthGuard + ParoquiaScopeGuard aqui quando o módulo Auth existir.
@Controller('montagens/:montagemId/lista-substituicao')
export class ListaSubstituicaoController {
  constructor(private readonly listaSubstituicaoService: ListaSubstituicaoService) {}

  @Post()
  create(@Param('montagemId') montagemId: string, @Body() dto: CreateItemListaSubstituicaoDto) {
    return this.listaSubstituicaoService.create(montagemId, dto);
  }

  @Get()
  findAll(@Param('montagemId') montagemId: string) {
    return this.listaSubstituicaoService.findAll(montagemId);
  }

  @Delete(':id')
  remove(@Param('montagemId') montagemId: string, @Param('id') id: string) {
    return this.listaSubstituicaoService.remove(montagemId, id);
  }
}
