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
import { FichasService } from './fichas.service';
import { CreateFichaDto } from './dto/create-ficha.dto';
import { UpdateFichaDto } from './dto/update-ficha.dto';
import { QueryFichasDto } from './dto/query-fichas.dto';

// TODO: aplicar JwtAuthGuard + ParoquiaScopeGuard aqui quando o módulo Auth existir
// (ver docs/arquitetura.md, seção 3) — hoje paroquiaId ainda vem manual no body/query.
@Controller('fichas')
export class FichasController {
  constructor(private readonly fichasService: FichasService) {}

  @Post()
  create(@Body() dto: CreateFichaDto) {
    return this.fichasService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryFichasDto) {
    return this.fichasService.findAll(query);
  }

  @Get('encontros')
  listNumerosEncontro(@Query('paroquiaId') paroquiaId: string) {
    return this.fichasService.listNumerosEncontro(paroquiaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fichasService.findOne(id);
  }

  @Get(':id/historico-equipes')
  historicoEquipes(@Param('id') id: string) {
    return this.fichasService.historicoEquipes(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFichaDto) {
    return this.fichasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fichasService.remove(id);
  }
}
