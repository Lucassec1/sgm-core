import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UsuarioAutenticado } from '../../common/types/usuario-autenticado';
import { autorDoLog } from '../../common/auth/autor-log';
import { ApiTags } from '@nestjs/swagger';
import { AlocacoesService } from './alocacoes.service';
import { CreateAlocacaoDto } from './dto/create-alocacao.dto';
import { UpdateAlocacaoDto } from './dto/update-alocacao.dto';
import { ParoquiaScopeGuard } from '../../common/guards/paroquia-scope.guard';
import { MontagemScopeGuard } from '../../common/guards/montagem-scope.guard';

@UseGuards(ParoquiaScopeGuard, MontagemScopeGuard)
@ApiTags('alocacoes')
@Controller('montagens/:montagemId/alocacoes')
export class AlocacoesController {
  constructor(private readonly alocacoesService: AlocacoesService) {}

  @Post()
  create(
    @Param('montagemId') montagemId: string,
    @Body() dto: CreateAlocacaoDto,
    @Req() req: Request & { user: UsuarioAutenticado },
  ) {
    return this.alocacoesService.create(montagemId, {
      ...dto,
      usuario: autorDoLog(req.user, dto.usuario),
    });
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
    @Req() req: Request & { user: UsuarioAutenticado },
  ) {
    return this.alocacoesService.update(montagemId, id, {
      ...dto,
      usuario: autorDoLog(req.user, dto.usuario),
    });
  }

  @Delete(':id')
  remove(@Param('montagemId') montagemId: string, @Param('id') id: string) {
    return this.alocacoesService.remove(montagemId, id);
  }
}
