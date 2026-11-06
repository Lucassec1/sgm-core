import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import { CreateMontagemDto } from './dto/create-montagem.dto';
import { UpdateMontagemDto } from './dto/update-montagem.dto';
import { QueryMontagensDto } from './dto/query-montagens.dto';
import { toCsv } from '../../common/export/csv.util';
import {
  VAGAS_INCLUDE,
  buscarMontagemComVagas,
  garantirMontagemDaParoquia,
} from './montagem-da-paroquia';

// Implantação: encontro que lança o Segue-me numa paróquia afilhada. Traz sempre 12 jovens
// "sementeiras" de lá (somados aos jovens locais) e exige 4 casais afilhados na Visitação —
// números fixos, não digitados pelo usuário. Ver docs/regras-imutaveis.md, R6.
const JOVENS_SEMENTEIRA_IMPLANTACAO = 12;
const CASAIS_AFILHADA_IMPLANTACAO = 4;

// Quantidade de casais da Eq. da Visitação — proporcional aos jovens vivenciando LOCAIS
// (~1 casal para cada 3 jovens, distribuição não uniforme quando não é múltiplo de 3). Numa
// implantação, os 12 jovens sementeira não entram nessa conta (eles não são "nossos"), mas
// somam-se 4 casais fixos da paróquia afilhada. Ver docs/regras-imutaveis.md, R6.
function calcularCasaisVisitacao(numeroJovensVivenciando: number, ehImplantacao: boolean): number {
  if (ehImplantacao) {
    const jovensLocais = numeroJovensVivenciando - JOVENS_SEMENTEIRA_IMPLANTACAO;
    return Math.ceil(jovensLocais / 3) + CASAIS_AFILHADA_IMPLANTACAO;
  }
  return Math.ceil(numeroJovensVivenciando / 3);
}

@Injectable()
export class MontagensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logAtividade: LogAtividadeService,
  ) {}

  async create(dto: CreateMontagemDto, paroquiaId: string) {
    const ehImplantacao = dto.ehImplantacao ?? false;
    // R6 — mínimo 40, máximo 60 jovens locais; numa implantação somam-se os 12 sementeira.
    const minimo = 40 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
    const maximo = 60 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
    if (dto.numeroJovensVivenciando < minimo || dto.numeroJovensVivenciando > maximo) {
      throw new BadRequestException(
        `numeroJovensVivenciando deve estar entre ${minimo} e ${maximo}${ehImplantacao ? ' (implantação: 40-60 locais + 12 sementeira)' : ''}`,
      );
    }

    // Montagem + vagas + log numa transação só: sem isso, uma falha no createMany deixaria
    // uma Montagem sem nenhuma vaga, e uma falha no log deixaria a criação sem rastro (R9).
    const montagem = await this.prisma.$transaction(async (tx) => {
      const ultimaMontagem = await tx.montagem.findFirst({
        where: { paroquiaId },
        orderBy: { numeroEncontro: 'desc' },
        select: { numeroEncontro: true },
      });
      const numeroEncontro = (ultimaMontagem?.numeroEncontro ?? 0) + 1;

      const cargos = await tx.cargo.findMany({ include: { equipe: true } });

      const criada = await tx.montagem.create({
        data: {
          paroquiaId,
          numeroEncontro,
          data: new Date(dto.data),
          padroeiro: dto.padroeiro,
          diretorEspiritual: dto.diretorEspiritual,
          ehImplantacao,
          paroquiaAfilhadaNome: dto.paroquiaAfilhadaNome,
          quantidadeJovensSementeira: ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : undefined,
          quantidadeCasaisAfilhada: ehImplantacao ? CASAIS_AFILHADA_IMPLANTACAO : undefined,
          numeroJovensVivenciando: dto.numeroJovensVivenciando,
        },
      });

      await tx.vagaMontagem.createMany({
        data: cargos.map((cargo) => ({
          montagemId: criada.id,
          equipeId: cargo.equipeId,
          cargoId: cargo.id,
          quantidadeCasais: cargo.quantidadeDinamica
            ? calcularCasaisVisitacao(dto.numeroJovensVivenciando, ehImplantacao)
            : cargo.quantidadeCasais,
          quantidadeRapazes: cargo.quantidadeRapazes,
          quantidadeMocas: cargo.quantidadeMocas,
        })),
      });

      await this.logAtividade.registrar(
        criada.id,
        dto.usuario,
        'CRIOU_MONTAGEM',
        `Encontro nº ${numeroEncontro}`,
        tx,
      );

      return criada;
    });

    return this.findOne(montagem.id, paroquiaId);
  }

  async findAll(query: QueryMontagensDto, paroquiaId: string) {
    const { status, page = 1, pageSize = 20 } = query;

    const where = {
      paroquiaId,
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.montagem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { numeroEncontro: 'desc' },
      }),
      this.prisma.montagem.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string, paroquiaId: string) {
    return buscarMontagemComVagas(this.prisma, id, paroquiaId);
  }

  // Exportação simples (docs/producao.md, item 4) — quem está alocado em cada vaga da montagem.
  async exportCsv(id: string, paroquiaId: string) {
    await garantirMontagemDaParoquia(this.prisma, id, paroquiaId);

    const vagas = await this.prisma.vagaMontagem.findMany({
      where: { montagemId: id },
      include: {
        equipe: true,
        cargo: true,
        alocacoes: { include: { ficha: true, fichaCasal: true } },
      },
      orderBy: [{ equipe: { ordem: 'asc' } }, { cargo: { ordem: 'asc' } }],
    });

    const headers = ['Equipe', 'Cargo', 'Pessoa', 'Status do convite'];
    const rows = vagas.flatMap((vaga) =>
      vaga.alocacoes.map((alocacao) => [
        vaga.equipe.nome,
        vaga.cargo.nome,
        alocacao.ficha?.nomeCompleto ??
          (alocacao.fichaCasal
            ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}`
            : ''),
        alocacao.status,
      ]),
    );
    return toCsv(headers, rows);
  }

  async update(id: string, dto: UpdateMontagemDto, paroquiaId: string) {
    const anterior = await this.findOne(id, paroquiaId);
    const { usuario, ...campos } = dto;

    // Recalcula a vaga dinâmica (Componentes da Visitação, R6) sempre que o nº de jovens
    // vivenciando ou o flag de implantação mudarem — o encontro é montado aos poucos, então
    // o número final de jovens só fecha depois de criada a Montagem (ver docs/ux-e-fluxos.md).
    const numeroJovensVivenciando = dto.numeroJovensVivenciando ?? anterior.numeroJovensVivenciando;
    const ehImplantacao = dto.ehImplantacao ?? anterior.ehImplantacao;
    const precisaRecalcular =
      dto.numeroJovensVivenciando !== undefined || dto.ehImplantacao !== undefined;

    if (precisaRecalcular) {
      const minimo = 40 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
      const maximo = 60 + (ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : 0);
      if (numeroJovensVivenciando < minimo || numeroJovensVivenciando > maximo) {
        throw new BadRequestException(
          `numeroJovensVivenciando deve estar entre ${minimo} e ${maximo}${ehImplantacao ? ' (implantação: 40-60 locais + 12 sementeira)' : ''}`,
        );
      }
    }

    // update da Montagem + recálculo da vaga dinâmica (R6) + log numa transação só.
    const montagem = await this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.montagem.update({
        where: { id },
        data: {
          ...campos,
          ...(dto.data && { data: new Date(dto.data) }),
          ...(dto.ehImplantacao !== undefined && {
            quantidadeJovensSementeira: dto.ehImplantacao ? JOVENS_SEMENTEIRA_IMPLANTACAO : null,
            quantidadeCasaisAfilhada: dto.ehImplantacao ? CASAIS_AFILHADA_IMPLANTACAO : null,
          }),
        },
        include: VAGAS_INCLUDE,
      });

      if (precisaRecalcular) {
        const vagaDinamica = atualizada.vagas.find((v) => v.cargo.quantidadeDinamica);
        if (vagaDinamica) {
          await tx.vagaMontagem.update({
            where: { id: vagaDinamica.id },
            data: {
              quantidadeCasais: calcularCasaisVisitacao(numeroJovensVivenciando, ehImplantacao),
            },
          });
        }
      }

      if (dto.status && dto.status !== anterior.status) {
        await this.logAtividade.registrar(
          id,
          usuario,
          'MUDOU_STATUS',
          `${anterior.status} -> ${dto.status}`,
          tx,
        );
      } else {
        await this.logAtividade.registrar(id, usuario, 'ATUALIZOU_MONTAGEM', undefined, tx);
      }

      return atualizada;
    });

    return precisaRecalcular ? this.findOne(id, paroquiaId) : montagem;
  }
}
