import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ArquivoRecebido, QuadrantesService } from './quadrantes.service';
import { ParoquiaScopeGuard } from '../../common/guards/paroquia-scope.guard';
import { MontagemScopeGuard } from '../../common/guards/montagem-scope.guard';

@UseGuards(ParoquiaScopeGuard, MontagemScopeGuard)
@ApiTags('quadrantes')
@Controller('montagens/:montagemId/quadrantes')
export class QuadrantesController {
  constructor(private readonly quadrantesService: QuadrantesService) {}

  @Get()
  listar(@Param('montagemId') montagemId: string) {
    return this.quadrantesService.listar(montagemId);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        usuario: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  adicionar(
    @Param('montagemId') montagemId: string,
    @UploadedFile() file: ArquivoRecebido | undefined,
    @Body('usuario') usuario?: string,
  ) {
    return this.quadrantesService.adicionar(montagemId, file, usuario);
  }

  @Get(':id/download')
  async download(
    @Param('montagemId') montagemId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { registro, stream } = await this.quadrantesService.paraDownload(montagemId, id);
    res.set({
      'Content-Type': registro.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(registro.nomeOriginal)}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete(':id')
  remover(
    @Param('montagemId') montagemId: string,
    @Param('id') id: string,
    @Body('usuario') usuario?: string,
  ) {
    return this.quadrantesService.remover(montagemId, id, usuario);
  }
}
