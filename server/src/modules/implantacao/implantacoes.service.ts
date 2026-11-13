import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FaseImplantacao, Prisma, RoleUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ParoquiasService } from '../paroquias/paroquias.service';
import { CreateImplantacaoDto } from './dto/create-implantacao.dto';

const ATIVA = { not: FaseImplantacao.ENCERRADA };

// Vínculo de implantação madrinha → afilhada (docs/implantacao.md), conduzido pelo Conselho (R8).
// As fases só andam pra frente: SEMENTEIRA → IMPLANTACAO → ACOMPANHAMENTO → ENCERRADA. O Conselho
// nunca vê fichas — da sementeira só recebe a contagem.
@Injectable()
export class ImplantacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paroquias: ParoquiasService,
  ) {}

  async criar(dto: CreateImplantacaoDto, conselhoUsuarioId: string) {
    const madrinha = await this.prisma.paroquia.findUnique({ where: { id: dto.madrinhaId } });
    if (!madrinha) {
      throw new NotFoundException(`Paróquia ${dto.madrinhaId} não encontrada`);
    }
    // Quem ainda está sendo implantada não amadrinha outra (norma, Art. 12: madrinha com o
    // Segue-me há pelo menos três anos).
    const madrinhaEmImplantacao = await this.prisma.implantacao.findFirst({
      where: { afilhadaId: dto.madrinhaId, fase: ATIVA },
    });
    if (madrinhaEmImplantacao) {
      throw new ConflictException(
        `${madrinha.nome} ainda está em implantação e não pode ser madrinha`,
      );
    }

    // A afilhada nasce aqui, sem conta de acesso — o Conselho libera depois (liberarAcesso).
    return this.prisma.$transaction(async (tx) => {
      const afilhada = await tx.paroquia.create({ data: { nome: dto.afilhadaNome.trim() } });
      return tx.implantacao.create({
        data: { madrinhaId: madrinha.id, afilhadaId: afilhada.id, criadaPorId: conselhoUsuarioId },
      });
    });
  }

  async listar() {
    const implantacoes = await this.prisma.implantacao.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        madrinha: { select: { id: true, nome: true } },
        afilhada: {
          select: {
            id: true,
            nome: true,
            usuarios: { where: { role: RoleUsuario.PAROQUIA }, select: { id: true } },
          },
        },
        _count: { select: { fichasSementeira: true } },
      },
    });
    return implantacoes.map((i) => ({
      id: i.id,
      fase: i.fase,
      madrinha: i.madrinha,
      afilhada: { id: i.afilhada.id, nome: i.afilhada.nome },
      afilhadaTemConta: i.afilhada.usuarios.length > 0,
      fichasSementeira: i._count.fichasSementeira,
      createdAt: i.createdAt,
      implantacaoIniciadaEm: i.implantacaoIniciadaEm,
      acompanhamentoIniciadoEm: i.acompanhamentoIniciadoEm,
      encerradaEm: i.encerradaEm,
    }));
  }

  // Começo da implantação: as fichas marcadas como sementeira desse vínculo passam a ser da
  // afilhada, na mesma transação da mudança de fase. Só as da madrinha — nunca as de outra.
  async iniciarImplantacao(id: string) {
    const vinculo = await this.buscar(id);
    this.exigirFase(vinculo.fase, FaseImplantacao.SEMENTEIRA);
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.ficha.updateMany({
        where: { sementeiraDeId: id, paroquiaId: vinculo.madrinhaId },
        data: { paroquiaId: vinculo.afilhadaId },
      });
      await tx.implantacao.update({
        where: { id },
        data: { fase: FaseImplantacao.IMPLANTACAO, implantacaoIniciadaEm: new Date() },
      });
      return { transferidas: count };
    });
  }

  passarParaAcompanhamento(id: string) {
    return this.avancar(id, FaseImplantacao.IMPLANTACAO, {
      fase: FaseImplantacao.ACOMPANHAMENTO,
      acompanhamentoIniciadoEm: new Date(),
    });
  }

  encerrar(id: string) {
    return this.avancar(id, FaseImplantacao.ACOMPANHAMENTO, {
      fase: FaseImplantacao.ENCERRADA,
      encerradaEm: new Date(),
    });
  }

  // A conta da afilhada sai pro II encontro (quando ela forma a equipe dirigente) — nunca na
  // Sementeira, quando a paróquia ainda nem opera o Segue-me.
  async liberarAcesso(id: string, email: string) {
    const vinculo = await this.buscar(id);
    if (vinculo.fase === FaseImplantacao.SEMENTEIRA) {
      throw new BadRequestException('A conta da afilhada é liberada a partir da implantação');
    }
    return this.paroquias.criarConta(vinculo.afilhadaId, email);
  }

  // Lado da madrinha: vínculos dela ainda não encerrados (menu "Atuar como", marca de sementeira,
  // liberação de fichas).
  minhas(paroquiaId: string) {
    return this.prisma.implantacao.findMany({
      where: { madrinhaId: paroquiaId, fase: ATIVA },
      select: { id: true, fase: true, afilhada: { select: { id: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listarLiberacoes(id: string, paroquiaId: string) {
    await this.vinculoDaMadrinha(id, paroquiaId);
    return this.prisma.liberacaoFicha.findMany({
      where: { implantacaoId: id },
      include: {
        ficha: { select: { id: true, nomeCompleto: true } },
        fichaCasal: { select: { id: true, nomeEle: true, nomeEla: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Acompanhamento: a madrinha cede uma ficha sua ("um jovem aqui e ali") pras montagens da
  // afilhada. Só as fichas liberadas aparecem pra afilhada — o resto da madrinha continua isolado.
  async liberar(
    id: string,
    paroquiaId: string,
    pessoa: { fichaId?: string; fichaCasalId?: string },
  ) {
    const vinculo = await this.vinculoDaMadrinha(id, paroquiaId);
    if (!!pessoa.fichaId === !!pessoa.fichaCasalId) {
      throw new BadRequestException('Informe exatamente uma ficha (jovem ou casal)');
    }
    this.exigirFase(vinculo.fase, FaseImplantacao.ACOMPANHAMENTO);
    const ficha = pessoa.fichaId
      ? await this.prisma.ficha.findFirst({ where: { id: pessoa.fichaId, paroquiaId } })
      : await this.prisma.fichaCasal.findFirst({ where: { id: pessoa.fichaCasalId, paroquiaId } });
    if (!ficha) {
      throw new NotFoundException('Ficha não encontrada');
    }
    return this.prisma.liberacaoFicha.create({
      data: { implantacaoId: id, fichaId: pessoa.fichaId, fichaCasalId: pessoa.fichaCasalId },
    });
  }

  async removerLiberacao(id: string, liberacaoId: string, paroquiaId: string) {
    await this.vinculoDaMadrinha(id, paroquiaId);
    const liberacao = await this.prisma.liberacaoFicha.findFirst({
      where: { id: liberacaoId, implantacaoId: id },
    });
    if (!liberacao) {
      throw new NotFoundException('Liberação não encontrada');
    }
    await this.prisma.liberacaoFicha.delete({ where: { id: liberacaoId } });
    return { ok: true };
  }

  private async vinculoDaMadrinha(id: string, paroquiaId: string) {
    const vinculo = await this.prisma.implantacao.findFirst({
      where: { id, madrinhaId: paroquiaId },
    });
    if (!vinculo) {
      throw new NotFoundException(`Implantação ${id} não encontrada`);
    }
    return vinculo;
  }

  private async avancar(
    id: string,
    faseAtual: FaseImplantacao,
    data: Prisma.ImplantacaoUpdateInput,
  ) {
    const vinculo = await this.buscar(id);
    this.exigirFase(vinculo.fase, faseAtual);
    return this.prisma.$transaction((tx) => tx.implantacao.update({ where: { id }, data }));
  }

  private async buscar(id: string) {
    const vinculo = await this.prisma.implantacao.findUnique({ where: { id } });
    if (!vinculo) {
      throw new NotFoundException(`Implantação ${id} não encontrada`);
    }
    return vinculo;
  }

  private exigirFase(atual: FaseImplantacao, esperada: FaseImplantacao) {
    if (atual !== esperada) {
      throw new BadRequestException(
        `Essa ação vale só na fase ${esperada} (a implantação está em ${atual})`,
      );
    }
  }
}
