import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FaseImplantacao } from '@prisma/client';
import { ANEXOS } from '../implantacao/anexos';
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

// Sementeira (R6): o encontro da madrinha recebe jovens da afilhada (12 por padrão, pode ser
// menos por desistência — docs/regras-imutaveis.md) e 4 casais fixos dela na Visitação.
const JOVENS_SEMENTEIRA_PADRAO = 12;
const CASAIS_AFILHADA_SEMENTEIRA = 4;

// Quantidade de casais da Eq. da Visitação — proporcional aos jovens vivenciando LOCAIS
// (~1 casal para cada 3 jovens, distribuição não uniforme quando não é múltiplo de 3). Com
// sementeira, os jovens da afilhada não entram nessa conta, mas somam-se 4 casais fixos dela.
function calcularCasaisVisitacao(
  numeroJovensVivenciando: number,
  jovensSementeira: number,
): number {
  const jovensLocais = numeroJovensVivenciando - jovensSementeira;
  return Math.ceil(jovensLocais / 3) + (jovensSementeira > 0 ? CASAIS_AFILHADA_SEMENTEIRA : 0);
}

// R6 — 40 a 60 jovens locais, mais os da sementeira quando houver.
function validarJovensVivenciando(numeroJovensVivenciando: number, jovensSementeira: number) {
  if (jovensSementeira < 0 || jovensSementeira > JOVENS_SEMENTEIRA_PADRAO) {
    throw new BadRequestException('A sementeira tem de 1 a 12 jovens');
  }
  const minimo = 40 + jovensSementeira;
  const maximo = 60 + jovensSementeira;
  if (numeroJovensVivenciando < minimo || numeroJovensVivenciando > maximo) {
    throw new BadRequestException(
      `numeroJovensVivenciando deve estar entre ${minimo} e ${maximo}${jovensSementeira ? ` (40-60 locais + ${jovensSementeira} sementeira)` : ''}`,
    );
  }
}

@Injectable()
export class MontagensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logAtividade: LogAtividadeService,
  ) {}

  async create(dto: CreateMontagemDto, paroquiaId: string) {
    const jovensSementeira = dto.recebeSementeira
      ? (dto.quantidadeJovensSementeira ?? JOVENS_SEMENTEIRA_PADRAO)
      : 0;
    validarJovensVivenciando(dto.numeroJovensVivenciando, jovensSementeira);
    if (dto.recebeSementeira && dto.sementeiraDeImplantacaoId) {
      await this.garantirVinculoDeSementeira(dto.sementeiraDeImplantacaoId, paroquiaId);
    }
    // Afilhada com vínculo em implantação: os encontros 1–3 dela seguem os Anexos I–III.
    const implantacao = await this.prisma.implantacao.findFirst({
      where: { afilhadaId: paroquiaId, fase: FaseImplantacao.IMPLANTACAO },
    });

    // Montagem + vagas + log numa transação só: sem isso, uma falha no createMany deixaria
    // uma Montagem sem nenhuma vaga, e uma falha no log deixaria a criação sem rastro (R9).
    const montagem = await this.prisma.$transaction(async (tx) => {
      const ultimaMontagem = await tx.montagem.findFirst({
        where: { paroquiaId },
        orderBy: { numeroEncontro: 'desc' },
        select: { numeroEncontro: true },
      });
      const numeroEncontro = (ultimaMontagem?.numeroEncontro ?? 0) + 1;
      const anexo = implantacao && numeroEncontro <= 3 ? (numeroEncontro as 1 | 2 | 3) : undefined;
      if (anexo && dto.recebeSementeira) {
        throw new BadRequestException('Encontro de implantação não recebe sementeira');
      }

      const cargos = await tx.cargo.findMany({ include: { equipe: true } });

      const criada = await tx.montagem.create({
        data: {
          paroquiaId,
          numeroEncontro,
          data: new Date(dto.data),
          padroeiro: dto.padroeiro,
          diretorEspiritual: dto.diretorEspiritual,
          recebeSementeira: !!dto.recebeSementeira,
          sementeiraDeImplantacaoId: dto.recebeSementeira
            ? dto.sementeiraDeImplantacaoId
            : undefined,
          quantidadeJovensSementeira: dto.recebeSementeira ? jovensSementeira : undefined,
          quantidadeCasaisAfilhada: dto.recebeSementeira ? CASAIS_AFILHADA_SEMENTEIRA : undefined,
          numeroJovensVivenciando: dto.numeroJovensVivenciando,
          ...(anexo && { implantacaoId: implantacao!.id, anexoImplantacao: anexo }),
        },
      });

      await tx.vagaMontagem.createMany({
        data: anexo
          ? vagasDoAnexo(anexo, cargos, criada.id)
          : cargos.map((cargo) => ({
              montagemId: criada.id,
              equipeId: cargo.equipeId,
              cargoId: cargo.id,
              quantidadeCasais: cargo.quantidadeDinamica
                ? calcularCasaisVisitacao(dto.numeroJovensVivenciando, jovensSementeira)
                : cargo.quantidadeCasais,
              quantidadeRapazes: cargo.quantidadeRapazes,
              quantidadeMocas: cargo.quantidadeMocas,
            })),
      });

      await this.logAtividade.registrar(
        criada.id,
        dto.usuario,
        'CRIOU_MONTAGEM',
        anexo
          ? `Encontro nº ${numeroEncontro} (implantação, Anexo ${'I'.repeat(anexo)})`
          : `Encontro nº ${numeroEncontro}`,
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
    const {
      usuario,
      recebeSementeira: recebeDto,
      quantidadeJovensSementeira: quantidadeDto,
      sementeiraDeImplantacaoId: vinculoDto,
      ...campos
    } = dto;

    // Recalcula a vaga dinâmica (Componentes da Visitação, R6) sempre que o nº de jovens
    // vivenciando ou a sementeira mudarem — o encontro é montado aos poucos, então o número
    // final de jovens só fecha depois de criada a Montagem (ver docs/ux-e-fluxos.md). Encontro
    // de implantação não recalcula: as vagas vêm do anexo.
    const numeroJovensVivenciando = dto.numeroJovensVivenciando ?? anterior.numeroJovensVivenciando;
    const recebeSementeira = recebeDto ?? anterior.recebeSementeira;
    const jovensSementeira = recebeSementeira
      ? (quantidadeDto ?? anterior.quantidadeJovensSementeira ?? JOVENS_SEMENTEIRA_PADRAO)
      : 0;
    const ehAnexo = anterior.anexoImplantacao != null;
    if (ehAnexo && recebeDto) {
      throw new BadRequestException('Encontro de implantação não recebe sementeira');
    }
    const precisaRecalcular =
      dto.numeroJovensVivenciando !== undefined ||
      recebeDto !== undefined ||
      quantidadeDto !== undefined;

    if (precisaRecalcular) {
      validarJovensVivenciando(numeroJovensVivenciando, jovensSementeira);
    }
    if (recebeSementeira && vinculoDto) {
      await this.garantirVinculoDeSementeira(vinculoDto, paroquiaId);
    }

    // update da Montagem + recálculo da vaga dinâmica (R6) + log numa transação só.
    const montagem = await this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.montagem.update({
        where: { id },
        data: {
          ...campos,
          ...(dto.data && { data: new Date(dto.data) }),
          ...((recebeDto !== undefined || quantidadeDto !== undefined) && {
            recebeSementeira,
            quantidadeJovensSementeira: recebeSementeira ? jovensSementeira : null,
            quantidadeCasaisAfilhada: recebeSementeira ? CASAIS_AFILHADA_SEMENTEIRA : null,
          }),
          ...(vinculoDto !== undefined && { sementeiraDeImplantacaoId: vinculoDto }),
        },
        include: VAGAS_INCLUDE,
      });

      if (precisaRecalcular && !ehAnexo) {
        const vagaDinamica = atualizada.vagas.find((v) => v.cargo.quantidadeDinamica);
        if (vagaDinamica) {
          await tx.vagaMontagem.update({
            where: { id: vagaDinamica.id },
            data: {
              quantidadeCasais: calcularCasaisVisitacao(numeroJovensVivenciando, jovensSementeira),
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

  // Vínculo escolhido em "Recebe sementeira": a paróquia tem que ser a madrinha e o vínculo
  // estar na Sementeira.
  private async garantirVinculoDeSementeira(implantacaoId: string, paroquiaId: string) {
    const vinculo = await this.prisma.implantacao.findFirst({
      where: { id: implantacaoId, madrinhaId: paroquiaId, fase: FaseImplantacao.SEMENTEIRA },
    });
    if (!vinculo) {
      throw new NotFoundException('Implantação não encontrada');
    }
  }
}

// Vagas de um encontro de implantação: uma por linha do anexo (equipe + cargo + origem).
function vagasDoAnexo(
  anexo: 1 | 2 | 3,
  cargos: { id: string; equipeId: string; nome: string; equipe: { slug: string } }[],
  montagemId: string,
) {
  return ANEXOS[anexo].map((linha) => {
    const cargo = cargos.find((c) => c.equipe.slug === linha.equipe && c.nome === linha.cargo);
    if (!cargo) {
      throw new Error(`Cargo ${linha.cargo} da equipe ${linha.equipe} não existe no catálogo`);
    }
    return {
      montagemId,
      equipeId: cargo.equipeId,
      cargoId: cargo.id,
      quantidadeCasais: linha.casais,
      quantidadeRapazes: linha.rapazes,
      quantidadeMocas: linha.mocas,
      quantidadeJovens: linha.jovens,
      origem: linha.origem,
    };
  });
}
