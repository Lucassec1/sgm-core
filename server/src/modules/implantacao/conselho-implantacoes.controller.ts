import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RoleUsuario } from '@prisma/client';
import { ImplantacoesService } from './implantacoes.service';
import { CreateImplantacaoDto } from './dto/create-implantacao.dto';
import { LiberarAcessoDto } from './dto/liberar-acesso.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../common/types/usuario-autenticado';

// R8 — o Conselho cria e conduz os vínculos de implantação. Nenhuma rota aqui devolve ficha.
@ApiTags('conselho')
@UseGuards(RolesGuard)
@Roles(RoleUsuario.CONSELHO)
@Controller('conselho/implantacoes')
export class ConselhoImplantacoesController {
  constructor(private readonly implantacoes: ImplantacoesService) {}

  @Get()
  listar() {
    return this.implantacoes.listar();
  }

  @Post()
  criar(@Body() dto: CreateImplantacaoDto, @Req() req: Request & { user: UsuarioAutenticado }) {
    return this.implantacoes.criar(dto, req.user.id);
  }

  @Post(':id/iniciar')
  iniciar(@Param('id') id: string) {
    return this.implantacoes.iniciarImplantacao(id);
  }

  @Post(':id/acompanhamento')
  acompanhamento(@Param('id') id: string) {
    return this.implantacoes.passarParaAcompanhamento(id);
  }

  @Post(':id/encerrar')
  encerrar(@Param('id') id: string) {
    return this.implantacoes.encerrar(id);
  }

  @Post(':id/acesso')
  liberarAcesso(@Param('id') id: string, @Body() dto: LiberarAcessoDto) {
    return this.implantacoes.liberarAcesso(id, dto.email);
  }
}
