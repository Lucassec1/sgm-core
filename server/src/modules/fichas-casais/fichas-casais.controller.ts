import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FichasCasaisService } from './fichas-casais.service';
import { CreateFichaCasalDto } from './dto/create-ficha-casal.dto';
import { UpdateFichaCasalDto } from './dto/update-ficha-casal.dto';
import { QueryFichasCasaisDto } from './dto/query-fichas-casais.dto';

// TODO: aplicar JwtAuthGuard + ParoquiaScopeGuard aqui quando o módulo Auth existir
// (ver docs/arquitetura.md, seção 3) — hoje paroquiaId ainda vem manual no body/query.
@Controller('fichas-casais')
export class FichasCasaisController {
  constructor(private readonly fichasCasaisService: FichasCasaisService) {}

  @Post()
  create(@Body() dto: CreateFichaCasalDto) {
    return this.fichasCasaisService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryFichasCasaisDto) {
    return this.fichasCasaisService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fichasCasaisService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFichaCasalDto) {
    return this.fichasCasaisService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fichasCasaisService.remove(id);
  }
}
