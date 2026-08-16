import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MontagensService } from './montagens.service';
import { CreateMontagemDto } from './dto/create-montagem.dto';
import { UpdateMontagemDto } from './dto/update-montagem.dto';
import { QueryMontagensDto } from './dto/query-montagens.dto';

// TODO: aplicar JwtAuthGuard + ParoquiaScopeGuard aqui quando o módulo Auth existir
// (ver docs/arquitetura.md, seção 3) — hoje paroquiaId ainda vem manual no body/query.
@Controller('montagens')
export class MontagensController {
  constructor(private readonly montagensService: MontagensService) {}

  @Post()
  create(@Body() dto: CreateMontagemDto) {
    return this.montagensService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryMontagensDto) {
    return this.montagensService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.montagensService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMontagemDto) {
    return this.montagensService.update(id, dto);
  }

  @Get(':id/equipes/:equipeId/coordenadores-sugeridos')
  coordenadoresSugeridos(@Param('id') id: string, @Param('equipeId') equipeId: string) {
    return this.montagensService.coordenadoresSugeridos(id, equipeId);
  }

  @Get(':id/candidatos-jovens')
  candidatosJovens(@Param('id') id: string) {
    return this.montagensService.candidatosJovens(id);
  }

  @Get(':id/log')
  listarLog(@Param('id') id: string) {
    return this.montagensService.listarLog(id);
  }
}
