import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsuarioAutenticado } from '../../common/types/usuario-autenticado';
import { autorDoLog } from '../../common/auth/autor-log';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MontagensService } from './montagens.service';
import { SugestoesMontagemService } from './sugestoes-montagem.service';
import { ResumoMontagemService } from './resumo-montagem.service';
import { CreateMontagemDto } from './dto/create-montagem.dto';
import { UpdateMontagemDto } from './dto/update-montagem.dto';
import { QueryMontagensDto } from './dto/query-montagens.dto';
import { ParoquiaScopeGuard } from '../../common/guards/paroquia-scope.guard';
import { ParoquiaAtual } from '../../common/decorators/paroquia-atual.decorator';

@UseGuards(ParoquiaScopeGuard)
@ApiTags('montagens')
@Controller('montagens')
export class MontagensController {
  constructor(
    private readonly montagensService: MontagensService,
    private readonly sugestoesService: SugestoesMontagemService,
    private readonly resumoService: ResumoMontagemService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateMontagemDto,
    @ParoquiaAtual() paroquiaId: string,
    @Req() req: Request & { user: UsuarioAutenticado },
  ) {
    return this.montagensService.create(
      { ...dto, usuario: autorDoLog(req.user, dto.usuario) },
      paroquiaId,
    );
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
    @Req() req: Request & { user: UsuarioAutenticado },
  ) {
    return this.montagensService.update(
      id,
      { ...dto, usuario: autorDoLog(req.user, dto.usuario) },
      paroquiaId,
    );
  }

  @Get(':id/equipes/:equipeId/coordenadores-sugeridos')
  coordenadoresSugeridos(
    @Param('id') id: string,
    @Param('equipeId') equipeId: string,
    @ParoquiaAtual() paroquiaId: string,
  ) {
    return this.sugestoesService.coordenadoresSugeridos(id, equipeId, paroquiaId);
  }

  @Get(':id/candidatos-jovens')
  candidatosJovens(
    @Param('id') id: string,
    @ParoquiaAtual() paroquiaId: string,
    @Query('vagaMontagemId') vagaMontagemId?: string,
  ) {
    return this.sugestoesService.candidatosJovens(id, paroquiaId, vagaMontagemId);
  }

  @Get(':id/candidatos-casais')
  candidatosCasais(
    @Param('id') id: string,
    @ParoquiaAtual() paroquiaId: string,
    @Query('vagaMontagemId') vagaMontagemId?: string,
  ) {
    return this.sugestoesService.candidatosCasais(id, paroquiaId, vagaMontagemId);
  }

  @Get(':id/log')
  listarLog(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.resumoService.listarLog(id, paroquiaId);
  }

  @Get(':id/observacoes')
  listarObservacoes(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.resumoService.listarObservacoes(id, paroquiaId);
  }

  @Get(':id/resumo')
  resumo(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.resumoService.resumo(id, paroquiaId);
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
