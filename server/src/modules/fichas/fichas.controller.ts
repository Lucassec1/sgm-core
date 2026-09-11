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
import { FichasService } from './fichas.service';
import { CreateFichaDto } from './dto/create-ficha.dto';
import { UpdateFichaDto } from './dto/update-ficha.dto';
import { QueryFichasDto } from './dto/query-fichas.dto';

// TODO: aplicar JwtAuthGuard + ParoquiaScopeGuard aqui quando o módulo Auth existir
// (ver docs/arquitetura.md, seção 3) — hoje paroquiaId ainda vem manual no body/query.
@ApiTags('fichas')
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

  @Post(':id/foto')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FOTO_BYTES } }))
  uploadFoto(@Param('id') id: string, @UploadedFile() file: ArquivoRecebido | undefined) {
    return this.fichasService.uploadFoto(id, file);
  }

  @Delete(':id/foto')
  removerFoto(@Param('id') id: string) {
    return this.fichasService.removerFoto(id);
  }

  @Get(':id/foto')
  async streamFoto(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { stream, mimetype } = await this.fichasService.streamFoto(id);
    res.set({ 'Content-Type': mimetype });
    return new StreamableFile(stream);
  }
}
