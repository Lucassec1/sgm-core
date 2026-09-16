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
import { FichasService } from './fichas.service';
import { CreateFichaDto } from './dto/create-ficha.dto';
import { UpdateFichaDto } from './dto/update-ficha.dto';
import { QueryFichasDto } from './dto/query-fichas.dto';

@UseGuards(ParoquiaScopeGuard)
@ApiTags('fichas')
@Controller('fichas')
export class FichasController {
  constructor(private readonly fichasService: FichasService) {}

  @Post()
  create(@Body() dto: CreateFichaDto, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasService.create(dto, paroquiaId);
  }

  @Get()
  findAll(@Query() query: QueryFichasDto, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasService.findAll(query, paroquiaId);
  }

  @Get('encontros')
  listNumerosEncontro(@ParoquiaAtual() paroquiaId: string) {
    return this.fichasService.listNumerosEncontro(paroquiaId);
  }

  @Get('export')
  async export(@ParoquiaAtual() paroquiaId: string, @Res({ passthrough: true }) res: Response) {
    const csv = await this.fichasService.exportCsv(paroquiaId);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fichas.csv"',
    });
    return csv;
  }

  @Get(':id')
  findOne(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasService.findOne(id, paroquiaId);
  }

  @Get(':id/historico-equipes')
  historicoEquipes(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasService.historicoEquipes(id, paroquiaId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFichaDto,
    @ParoquiaAtual() paroquiaId: string,
  ) {
    return this.fichasService.update(id, dto, paroquiaId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasService.remove(id, paroquiaId);
  }

  @Post(':id/foto')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FOTO_BYTES } }))
  uploadFoto(
    @Param('id') id: string,
    @UploadedFile() file: ArquivoRecebido | undefined,
    @ParoquiaAtual() paroquiaId: string,
  ) {
    return this.fichasService.uploadFoto(id, file, paroquiaId);
  }

  @Delete(':id/foto')
  removerFoto(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.fichasService.removerFoto(id, paroquiaId);
  }

  @Get(':id/foto')
  async streamFoto(
    @Param('id') id: string,
    @ParoquiaAtual() paroquiaId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, mimetype } = await this.fichasService.streamFoto(id, paroquiaId);
    res.set({ 'Content-Type': mimetype });
    return new StreamableFile(stream);
  }
}
