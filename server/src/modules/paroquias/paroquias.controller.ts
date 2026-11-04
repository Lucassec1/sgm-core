import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleUsuario } from '@prisma/client';
import { ParoquiasService } from './paroquias.service';
import { CreateParoquiaDto } from './dto/create-paroquia.dto';
import { AlterarEmailParoquiaDto } from './dto/alterar-email-paroquia.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// Cadastro de paróquia e gestão de credencial — responsabilidade do Conselho (docs/requisitos.md,
// seção 6; docs/regras-imutaveis.md, R7/R8).
@ApiTags('paroquias')
@UseGuards(RolesGuard)
@Roles(RoleUsuario.CONSELHO)
@Controller('paroquias')
export class ParoquiasController {
  constructor(private readonly paroquiasService: ParoquiasService) {}

  @Get()
  findAll() {
    return this.paroquiasService.findAll();
  }

  @Post()
  create(@Body() dto: CreateParoquiaDto) {
    return this.paroquiasService.create(dto);
  }

  @Patch(':id/email')
  alterarEmail(@Param('id') id: string, @Body() dto: AlterarEmailParoquiaDto) {
    return this.paroquiasService.alterarEmail(id, dto.email);
  }

  @Patch(':id/redefinir-acesso')
  redefinirAcesso(@Param('id') id: string) {
    return this.paroquiasService.redefinirAcesso(id);
  }
}
