import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import { MontagensService } from './montagens.service';
import { CreateItemListaSubstituicaoDto } from './dto/create-item-lista-substituicao.dto';

const ITEM_INCLUDE = { ficha: true, fichaCasal: true };

// Lista geral de substituição da Montagem — "banco de backups" independente de vaga/equipe
// (ver docs/ux-e-fluxos.md, seção 3). Por montagem: não carrega de um encontro pro outro.
@Injectable()
export class ListaSubstituicaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly montagensService: MontagensService,
    private readonly logAtividade: LogAtividadeService,
  ) {}

  async create(montagemId: string, dto: CreateItemListaSubstituicaoDto) {
    await this.montagensService.findOne(montagemId);

    try {
      const item = await this.prisma.listaSubstituicao.create({
        data: {
          montagemId,
          tipoPessoa: dto.tipoPessoa,
          fichaId: dto.fichaId,
          fichaCasalId: dto.fichaCasalId,
          nota: dto.nota,
        },
        include: ITEM_INCLUDE,
      });

      await this.logAtividade.registrar(
        montagemId,
        dto.usuario,
        'ADICIONOU_LISTA_SUBSTITUICAO',
        item.ficha?.nomeCompleto ?? `${item.fichaCasal?.nomeEle} e ${item.fichaCasal?.nomeEla}`,
      );

      return item;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Essa pessoa já está na lista de substituição desta montagem');
      }
      throw err;
    }
  }

  async findAll(montagemId: string) {
    await this.montagensService.findOne(montagemId);
    return this.prisma.listaSubstituicao.findMany({
      where: { montagemId },
      include: ITEM_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(montagemId: string, id: string) {
    const item = await this.prisma.listaSubstituicao.findUnique({ where: { id }, include: ITEM_INCLUDE });
    if (!item || item.montagemId !== montagemId) {
      throw new NotFoundException(`Item ${id} não encontrado na lista de substituição da montagem ${montagemId}`);
    }

    await this.prisma.listaSubstituicao.delete({ where: { id } });
    await this.logAtividade.registrar(
      montagemId,
      undefined,
      'REMOVEU_LISTA_SUBSTITUICAO',
      item.ficha?.nomeCompleto ?? `${item.fichaCasal?.nomeEle} e ${item.fichaCasal?.nomeEla}`,
    );

    return item;
  }
}
