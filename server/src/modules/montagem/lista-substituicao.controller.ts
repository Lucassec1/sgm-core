import { Body, Controller, Delete, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UsuarioAutenticado } from '../../common/types/usuario-autenticado';
import { autorDoLog } from '../../common/auth/autor-log';
import { ApiTags } from '@nestjs/swagger';
import { ListaSubstituicaoService } from './lista-substituicao.service';
import { CreateItemListaSubstituicaoDto } from './dto/create-item-lista-substituicao.dto';
import { ParoquiaScopeGuard } from '../../common/guards/paroquia-scope.guard';
import { MontagemScopeGuard } from '../../common/guards/montagem-scope.guard';

@UseGuards(ParoquiaScopeGuard, MontagemScopeGuard)
@ApiTags('lista-substituicao')
@Controller('montagens/:montagemId/lista-substituicao')
export class ListaSubstituicaoController {
  constructor(private readonly listaSubstituicaoService: ListaSubstituicaoService) {}

  @Post()
  create(
    @Param('montagemId') montagemId: string,
    @Body() dto: CreateItemListaSubstituicaoDto,
    @Req() req: Request & { user: UsuarioAutenticado },
  ) {
    return this.listaSubstituicaoService.create(montagemId, {
      ...dto,
      usuario: autorDoLog(req.user, dto.usuario),
    });
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
