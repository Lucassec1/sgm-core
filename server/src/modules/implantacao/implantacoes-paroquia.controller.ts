import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ImplantacoesService } from './implantacoes.service';
import { LiberarFichaDto } from './dto/liberar-ficha.dto';
import { ParoquiaAtual } from '../../common/decorators/paroquia-atual.decorator';
import { ParoquiaScopeGuard } from '../../common/guards/paroquia-scope.guard';

// Lado da paróquia madrinha: vínculos dela e liberação de fichas no Acompanhamento. Atuando como
// afilhada, a sessão já aponta pra afilhada — que não é madrinha de nada, então nada aparece.
@ApiTags('implantacoes')
@UseGuards(ParoquiaScopeGuard)
@Controller('implantacoes')
export class ImplantacoesParoquiaController {
  constructor(private readonly implantacoes: ImplantacoesService) {}

  @Get('minhas')
  minhas(@ParoquiaAtual() paroquiaId: string) {
    return this.implantacoes.minhas(paroquiaId);
  }

  @Get(':id/liberacoes')
  listarLiberacoes(@Param('id') id: string, @ParoquiaAtual() paroquiaId: string) {
    return this.implantacoes.listarLiberacoes(id, paroquiaId);
  }

  @Post(':id/liberacoes')
  liberar(
    @Param('id') id: string,
    @Body() dto: LiberarFichaDto,
    @ParoquiaAtual() paroquiaId: string,
  ) {
    return this.implantacoes.liberar(id, paroquiaId, dto);
  }

  @Delete(':id/liberacoes/:liberacaoId')
  removerLiberacao(
    @Param('id') id: string,
    @Param('liberacaoId') liberacaoId: string,
    @ParoquiaAtual() paroquiaId: string,
  ) {
    return this.implantacoes.removerLiberacao(id, liberacaoId, paroquiaId);
  }
}
