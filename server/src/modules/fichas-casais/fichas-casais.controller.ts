import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ArquivoRecebido, MAX_FOTO_BYTES } from '../../common/uploads/foto-storage';
import { FichasCasaisService } from './fichas-casais.service';
import { CreateFichaCasalDto } from './dto/create-ficha-casal.dto';
import { UpdateFichaCasalDto } from './dto/update-ficha-casal.dto';
import { QueryFichasCasaisDto } from './dto/query-fichas-casais.dto';

// TODO: aplicar JwtAuthGuard + ParoquiaScopeGuard aqui quando o módulo Auth existir
// (ver docs/arquitetura.md, seção 3) — hoje paroquiaId ainda vem manual no body/query.
@ApiTags('fichas-casais')
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

  @Get(':id/historico-equipes')
  historicoEquipes(@Param('id') id: string) {
    return this.fichasCasaisService.historicoEquipes(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFichaCasalDto) {
    return this.fichasCasaisService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fichasCasaisService.remove(id);
  }

  @Post(':id/foto')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FOTO_BYTES } }))
  uploadFoto(@Param('id') id: string, @UploadedFile() file: ArquivoRecebido | undefined) {
    return this.fichasCasaisService.uploadFoto(id, file);
  }

  @Delete(':id/foto')
  removerFoto(@Param('id') id: string) {
    return this.fichasCasaisService.removerFoto(id);
  }

  @Get(':id/foto')
  async streamFoto(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { stream, mimetype } = await this.fichasCasaisService.streamFoto(id);
    res.set({ 'Content-Type': mimetype });
    return new StreamableFile(stream);
  }
}
