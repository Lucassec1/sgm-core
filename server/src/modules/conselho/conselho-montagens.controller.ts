import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RoleUsuario } from '@prisma/client';
import { ConselhoService } from './conselho.service';
import { QueryConselhoMontagensDto } from './dto/query-conselho-montagens.dto';
import { CreateObservacaoDto } from './dto/create-observacao.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../common/types/usuario-autenticado';

// R8 — Conselho: leitura de qualquer paróquia (em andamento + finalizadas) e observações.
// Não expõe Fichas (regra explícita do R8) — só rotas de Montagem existem neste módulo.
@ApiTags('conselho')
@UseGuards(RolesGuard)
@Roles(RoleUsuario.CONSELHO)
@Controller('conselho/montagens')
export class ConselhoMontagensController {
  constructor(private readonly conselhoService: ConselhoService) {}

  @Get()
  listar(@Query() query: QueryConselhoMontagensDto) {
    return this.conselhoService.listarMontagens(query);
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.conselhoService.obterMontagem(id);
  }

  @Get(':id/observacoes')
  listarObservacoes(@Param('id') id: string) {
    return this.conselhoService.listarObservacoes(id);
  }

  @Post(':id/observacoes')
  criarObservacao(
    @Param('id') id: string,
    @Body() dto: CreateObservacaoDto,
    @Req() req: Request & { user: UsuarioAutenticado },
  ) {
    // `usuarioId` sempre vem do token, nunca do body — R8 exige que toda observação mostre
    // o nome de quem de fato a registrou, não um nome digitado livremente.
    return this.conselhoService.criarObservacao(id, req.user.id, dto.texto);
  }
}
