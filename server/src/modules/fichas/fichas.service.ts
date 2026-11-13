import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FaseImplantacao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ArquivoRecebido,
  MAX_FOTO_BYTES,
  encontrarFoto,
  mimetypeAceito,
  removerFoto as removerArquivoFoto,
  salvarFoto,
} from '../../common/uploads/foto-storage';
import { CreateFichaDto } from './dto/create-ficha.dto';
import { UpdateFichaDto } from './dto/update-ficha.dto';
import { QueryFichasDto } from './dto/query-fichas.dto';
import { toCsv } from '../../common/export/csv.util';

// Prefixo da chave no S3 (ver common/uploads/foto-storage.ts) — cada tipo de ficha no seu.
const FOTOS_PREFIXO = 'fichas';

// Origem da sementeira na ficha: "Sementeira de Paróquia X" (madrinha) ou "vivenciou como
// sementeira na Paróquia Y" (afilhada, depois da transferência).
const SEMENTEIRA_INCLUDE = {
  sementeiraDe: {
    select: {
      id: true,
      fase: true,
      madrinha: { select: { id: true, nome: true } },
      afilhada: { select: { id: true, nome: true } },
    },
  },
} as const;

@Injectable()
export class FichasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFichaDto, paroquiaId: string) {
    await this.validarSementeira(dto.sementeiraDeId, paroquiaId, null);
    return this.prisma.ficha.create({
      data: { ...dto, paroquiaId, dataNascimento: new Date(dto.dataNascimento) },
    });
  }

  async findAll(query: QueryFichasDto, paroquiaId: string) {
    const { nome, numeroEncontro, situacao, page = 1, pageSize = 20 } = query;

    const where = {
      paroquiaId,
      ...(nome && { nomeCompleto: { contains: nome, mode: 'insensitive' as const } }),
      ...(numeroEncontro && { numeroEncontro }),
      ...(situacao && { situacao }),
    };

    const [items, total] = await Promise.all([
      this.prisma.ficha.findMany({
        where,
        include: SEMENTEIRA_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nomeCompleto: 'asc' },
      }),
      this.prisma.ficha.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listNumerosEncontro(paroquiaId: string) {
    const rows = await this.prisma.ficha.findMany({
      where: { paroquiaId },
      distinct: ['numeroEncontro'],
      select: { numeroEncontro: true },
      orderBy: { numeroEncontro: 'desc' },
    });
    return rows.map((r) => r.numeroEncontro);
  }

  // Exportação simples (docs/producao.md, item 4) — CSV com todas as fichas da paróquia,
  // sem paginação, pra alguém não-técnico conseguir um retrato completo dos dados.
  async exportCsv(paroquiaId: string) {
    const fichas = await this.prisma.ficha.findMany({
      where: { paroquiaId },
      orderBy: { nomeCompleto: 'asc' },
    });

    const headers = [
      'Nome completo',
      'Sexo',
      'Data de nascimento',
      'Telefone',
      'Email',
      'Cidade',
      'Nº do encontro',
      'Cor do círculo',
      'Situação',
      'Termo assinado',
    ];
    const rows = fichas.map((f) => [
      f.nomeCompleto,
      f.sexo,
      f.dataNascimento.toISOString().slice(0, 10),
      f.telefone,
      f.email,
      f.cidade,
      f.numeroEncontro,
      f.corCirculo,
      f.situacao,
      f.termoAssinado ? 'Sim' : 'Não',
    ]);
    return toCsv(headers, rows);
  }

  // `paroquiaId`, quando informado, garante o isolamento entre paróquias (R7): uma Ficha só
  // é encontrada por quem pediu se pertencer à mesma paróquia — NotFound, não Forbidden, pra
  // não revelar que o registro existe em outra paróquia.
  async findOne(id: string, paroquiaId?: string) {
    const ficha = await this.prisma.ficha.findUnique({
      where: { id },
      include: SEMENTEIRA_INCLUDE,
    });
    if (!ficha || (paroquiaId && ficha.paroquiaId !== paroquiaId)) {
      throw new NotFoundException(`Ficha ${id} não encontrada`);
    }
    return ficha;
  }

  async update(id: string, dto: UpdateFichaDto, paroquiaId: string) {
    const atual = await this.findOne(id, paroquiaId);
    await this.validarSementeira(dto.sementeiraDeId, paroquiaId, atual.sementeiraDeId ?? null);
    return this.prisma.ficha.update({
      where: { id },
      data: { ...dto, ...(dto.dataNascimento && { dataNascimento: new Date(dto.dataNascimento) }) },
    });
  }

  // Marca de sementeira: só a madrinha marca, e só com o vínculo na fase Sementeira. Depois que a
  // implantação começa a marca fica (identifica a origem — R5), então desmarcar também é só na
  // Sementeira. `undefined` = campo não enviado, nada a validar.
  private async validarSementeira(
    novo: string | null | undefined,
    paroquiaId: string,
    atual: string | null,
  ) {
    if (novo === undefined || novo === atual) return;
    if (novo === null) {
      const vinculo = await this.prisma.implantacao.findUnique({ where: { id: atual! } });
      if (vinculo?.fase !== FaseImplantacao.SEMENTEIRA) {
        throw new BadRequestException(
          'A marca de sementeira só pode ser removida antes de a implantação começar',
        );
      }
      return;
    }
    const vinculo = await this.prisma.implantacao.findFirst({
      where: { id: novo, madrinhaId: paroquiaId, fase: FaseImplantacao.SEMENTEIRA },
    });
    if (!vinculo) {
      throw new NotFoundException('Implantação não encontrada');
    }
  }

  async remove(id: string, paroquiaId: string) {
    await this.findOne(id, paroquiaId);
    await removerArquivoFoto(FOTOS_PREFIXO, id);
    return this.prisma.ficha.delete({ where: { id } });
  }

  // Upload de foto 3x4 (docs/historico/propostas.md, proposta #4) — substitui o campo `fotoUrl` manual.
  // Só faz sentido depois que a Ficha já existe (o arquivo em disco usa o id dela como nome).
  async uploadFoto(id: string, arquivo: ArquivoRecebido | undefined, paroquiaId: string) {
    await this.findOne(id, paroquiaId);
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado (campo "file")');
    if (!mimetypeAceito(arquivo.mimetype)) {
      throw new BadRequestException('Formato não aceito — envie uma imagem JPEG, PNG ou WEBP');
    }
    if (arquivo.size > MAX_FOTO_BYTES) {
      throw new BadRequestException('Arquivo acima de 5 MB');
    }

    await salvarFoto(FOTOS_PREFIXO, id, arquivo.mimetype, arquivo.buffer);
    return this.prisma.ficha.update({ where: { id }, data: { fotoUrl: `/fichas/${id}/foto` } });
  }

  async removerFoto(id: string, paroquiaId: string) {
    await this.findOne(id, paroquiaId);
    await removerArquivoFoto(FOTOS_PREFIXO, id);
    return this.prisma.ficha.update({ where: { id }, data: { fotoUrl: null } });
  }

  async streamFoto(id: string, paroquiaId: string) {
    await this.findOne(id, paroquiaId);
    const foto = await encontrarFoto(FOTOS_PREFIXO, id);
    if (!foto) throw new NotFoundException('Essa ficha não tem foto');
    return foto;
  }

  // Histórico de equipes servidas — dado gerado pelo módulo Montagem (Alocacao), não
  // armazenado na Ficha (ver docs/requisitos.md, 2.1). Cobre qualquer status, não só
  // ACEITO, pra também mostrar convites em aberto/recusas no histórico.
  async historicoEquipes(id: string, paroquiaId: string) {
    await this.findOne(id, paroquiaId);
    const alocacoes = await this.prisma.alocacao.findMany({
      where: { fichaId: id },
      include: {
        vagaMontagem: {
          include: {
            equipe: true,
            cargo: true,
            montagem: {
              select: {
                numeroEncontro: true,
                data: true,
                status: true,
                paroquiaId: true,
                paroquia: { select: { nome: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Implantação: serviço num encontro de outra paróquia (madrinha <-> afilhada) aparece com o
    // nome dela.
    return alocacoes.map((a) => ({
      ...a,
      outraParoquia: a.vagaMontagem.montagem.paroquiaId !== paroquiaId,
    }));
  }
}
