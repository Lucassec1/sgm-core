import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MontagensService } from './montagens.service';
import { CreateMontagemDto } from './dto/create-montagem.dto';
import { UpdateMontagemDto } from './dto/update-montagem.dto';
import { QueryMontagensDto } from './dto/query-montagens.dto';
import { ParoquiaScopeGuard } from '../../common/guards/paroquia-scope.guard';
import { ParoquiaAtual } from '../../common/decorators/paroquia-atual.decorator';

@UseGuards(ParoquiaScopeGuard)
@ApiTags('montagens')
@Controller('montagens')
export class MontagensController {
  constructor(private readonly montagensService: MontagensService) {}

  @Post()
  create(@Body() dto: CreateMontagemDto, @ParoquiaAtual() paroquiaId: string) {
    return this.montagensService.create(dto, paroquiaId);
  }

  @Get()
  findAll(@Query() query: QueryMontagensDto, @ParoquiaAtual() paroquiaId: string) {
    return this.montagensService.findAll(query, paroquiaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.montagensService.findOne(id, paroquiaId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMontagemDto,
    @ParoquiaAtual() paroquiaId: string,
  ) {
    return this.montagensService.update(id, dto, paroquiaId);
  }

  @Get(':id/equipes/:equipeId/coordenadores-sugeridos')
  coordenadoresSugeridos(
    @Param('id') id: string,
    @Param('equipeId') equipeId: string,
    @ParoquiaAtual() paroquiaId: string,
  ) {
    return this.montagensService.coordenadoresSugeridos(id, equipeId, paroquiaId);
  }

  @Get(':id/candidatos-jovens')
  candidatosJovens(
    @Param('id') id: string,
    @ParoquiaAtual() paroquiaId: string,
    @Query('vagaMontagemId') vagaMontagemId?: string,
  ) {
    return this.montagensService.candidatosJovens(id, paroquiaId, vagaMontagemId);
  }

  @Get(':id/log')
  listarLog(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.montagensService.listarLog(id, paroquiaId);
  }

  @Get(':id/resumo')
  resumo(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.montagensService.resumo(id, paroquiaId);
  }

  @Get(':id/export')
  async export(
    @Param('id') id: string,
    @ParoquiaAtual() paroquiaId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.montagensService.exportCsv(id, paroquiaId);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="montagem.csv"',
    });
    return csv;
  }
}
