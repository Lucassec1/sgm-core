import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlocacaoDto } from './dto/create-alocacao.dto';
import { UpdateAlocacaoDto } from './dto/update-alocacao.dto';

// CRUD básico das Alocações (pessoa <-> vaga) de uma Montagem. As regras R1-R3 (bloqueio de
// recusa/desistência, limite de 3x, quem pode coordenar) e o bloqueio de convite do R4
// (Eq. dos Círculos primeiro) ainda NÃO são validadas aqui — ver plano da etapa "Módulo
// Montagem — Schema + Fundação Backend".
@Injectable()
export class AlocacoesService {
  constructor(private readonly prisma: PrismaService) {}

  private async vagaPertenceAMontagem(montagemId: string, vagaMontagemId: string) {
    const vaga = await this.prisma.vagaMontagem.findUnique({ where: { id: vagaMontagemId } });
    if (!vaga || vaga.montagemId !== montagemId) {
      throw new BadRequestException(`Vaga ${vagaMontagemId} não pertence à montagem ${montagemId}`);
    }
  }

  async create(montagemId: string, dto: CreateAlocacaoDto) {
    await this.vagaPertenceAMontagem(montagemId, dto.vagaMontagemId);

    return this.prisma.alocacao.create({
      data: {
        vagaMontagemId: dto.vagaMontagemId,
        tipoPessoa: dto.tipoPessoa,
        fichaId: dto.fichaId,
        fichaCasalId: dto.fichaCasalId,
        status: dto.status,
        dataConvite: dto.dataConvite ? new Date(dto.dataConvite) : undefined,
        motivoRecusa: dto.motivoRecusa,
      },
    });
  }

  findAll(montagemId: string) {
    return this.prisma.alocacao.findMany({
      where: { vagaMontagem: { montagemId } },
      include: { vagaMontagem: { include: { equipe: true, cargo: true } }, ficha: true, fichaCasal: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(montagemId: string, id: string) {
    const alocacao = await this.prisma.alocacao.findUnique({
      where: { id },
      include: { vagaMontagem: { include: { equipe: true, cargo: true } }, ficha: true, fichaCasal: true },
    });
    if (!alocacao || alocacao.vagaMontagem.montagemId !== montagemId) {
      throw new NotFoundException(`Alocação ${id} não encontrada na montagem ${montagemId}`);
    }
    return alocacao;
  }

  async update(montagemId: string, id: string, dto: UpdateAlocacaoDto) {
    await this.findOne(montagemId, id);
    return this.prisma.alocacao.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.dataConvite && { dataConvite: new Date(dto.dataConvite) }),
        ...(dto.dataResposta && { dataResposta: new Date(dto.dataResposta) }),
      },
    });
  }

  async remove(montagemId: string, id: string) {
    await this.findOne(montagemId, id);
    return this.prisma.alocacao.delete({ where: { id } });
  }
}
