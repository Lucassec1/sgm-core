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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ArquivoRecebido, MAX_FOTO_BYTES } from '../../common/uploads/foto-storage';
import { ParoquiaAtual } from '../../common/decorators/paroquia-atual.decorator';
import { ParoquiaScopeGuard } from '../../common/guards/paroquia-scope.guard';
import { FichasCasaisService } from './fichas-casais.service';
import { CreateFichaCasalDto } from './dto/create-ficha-casal.dto';
import { UpdateFichaCasalDto } from './dto/update-ficha-casal.dto';
import { QueryFichasCasaisDto } from './dto/query-fichas-casais.dto';

@UseGuards(ParoquiaScopeGuard)
@ApiTags('fichas-casais')
@Controller('fichas-casais')
export class FichasCasaisController {
  constructor(private readonly fichasCasaisService: FichasCasaisService) {}

  @Post()
  create(@Body() dto: CreateFichaCasalDto, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasCasaisService.create(dto, paroquiaId);
  }

  @Get()
  findAll(@Query() query: QueryFichasCasaisDto, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasCasaisService.findAll(query, paroquiaId);
  }

  @Get('export')
  async export(@ParoquiaAtual() paroquiaId: string, @Res({ passthrough: true }) res: Response) {
    const csv = await this.fichasCasaisService.exportCsv(paroquiaId);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fichas-casais.csv"',
    });
    return csv;
  }

  @Get(':id')
  findOne(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasCasaisService.findOne(id, paroquiaId);
  }

  @Get(':id/historico-equipes')
  historicoEquipes(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasCasaisService.historicoEquipes(id, paroquiaId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFichaCasalDto, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasCasaisService.update(id, dto, paroquiaId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasCasaisService.remove(id, paroquiaId);
  }

  @Post(':id/foto')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FOTO_BYTES } }))
  uploadFoto(
    @Param('id') id: string,
    @UploadedFile() file: ArquivoRecebido | undefined,
    @ParoquiaAtual() paroquiaId: string,
  ) {
    return this.fichasCasaisService.uploadFoto(id, file, paroquiaId);
  }

  @Delete(':id/foto')
  removerFoto(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasCasaisService.removerFoto(id, paroquiaId);
  }

  @Get(':id/foto')
  async streamFoto(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string, @Res({ passthrough: true }) res: Response) {
    const { stream, mimetype } = await this.fichasCasaisService.streamFoto(id, paroquiaId);
    res.set({ 'Content-Type': mimetype });
    return new StreamableFile(stream);
  }
}
