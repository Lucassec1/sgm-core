import { join } from 'path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ArquivoRecebido,
  MAX_FOTO_BYTES,
  encontrarFoto,
  mimetypeAceito,
  removerFoto as removerArquivoFoto,
  salvarFoto,
  streamFoto as streamArquivoFoto,
} from '../../common/uploads/foto-storage';
import { CreateFichaCasalDto } from './dto/create-ficha-casal.dto';
import { UpdateFichaCasalDto } from './dto/update-ficha-casal.dto';
import { QueryFichasCasaisDto } from './dto/query-fichas-casais.dto';

const FOTOS_DIR = join(process.env.UPLOADS_DIR || join(process.cwd(), 'uploads'), 'fichas-casais');

// Prisma exige DateTime ISO-8601 completo; datas vindas de <input type="date"> chegam como
// "YYYY-MM-DD" — `new Date(...)` normaliza antes de gravar.
function parseDatasNascimento(dto: { dataNascimentoEle?: string; dataNascimentoEla?: string }) {
  return {
    ...(dto.dataNascimentoEle && { dataNascimentoEle: new Date(dto.dataNascimentoEle) }),
    ...(dto.dataNascimentoEla && { dataNascimentoEla: new Date(dto.dataNascimentoEla) }),
  };
}

@Injectable()
export class FichasCasaisService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFichaCasalDto) {
    return this.prisma.fichaCasal.create({ data: { ...dto, ...parseDatasNascimento(dto) } });
  }

  async findAll(query: QueryFichasCasaisDto) {
    const { paroquiaId, nome, situacao, page = 1, pageSize = 20 } = query;

    const where = {
      paroquiaId,
      ...(nome && {
        OR: [
          { nomeEle: { contains: nome, mode: 'insensitive' as const } },
          { nomeEla: { contains: nome, mode: 'insensitive' as const } },
        ],
      }),
      ...(situacao && { situacao }),
    };

    const [items, total] = await Promise.all([
      this.prisma.fichaCasal.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nomeEle: 'asc' },
      }),
      this.prisma.fichaCasal.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const fichaCasal = await this.prisma.fichaCasal.findUnique({ where: { id } });
    if (!fichaCasal) {
      throw new NotFoundException(`Ficha de casal ${id} não encontrada`);
    }
    return fichaCasal;
  }

  async update(id: string, dto: UpdateFichaCasalDto) {
    await this.findOne(id);
    return this.prisma.fichaCasal.update({ where: { id }, data: { ...dto, ...parseDatasNascimento(dto) } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await removerArquivoFoto(FOTOS_DIR, id);
    return this.prisma.fichaCasal.delete({ where: { id } });
  }

  // Upload de foto do casal (docs/propostas.md, proposta #4) — mesmo padrão da Ficha do
  // Jovem (ver FichasService), um arquivo por registro.
  async uploadFoto(id: string, arquivo: ArquivoRecebido | undefined) {
    await this.findOne(id);
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado (campo "file")');
    if (!mimetypeAceito(arquivo.mimetype)) {
      throw new BadRequestException('Formato não aceito — envie uma imagem JPEG, PNG ou WEBP');
    }
    if (arquivo.size > MAX_FOTO_BYTES) {
      throw new BadRequestException('Arquivo acima de 5 MB');
    }

    await salvarFoto(FOTOS_DIR, id, arquivo.mimetype, arquivo.buffer);
    return this.prisma.fichaCasal.update({ where: { id }, data: { fotoUrl: `/fichas-casais/${id}/foto` } });
  }

  async removerFoto(id: string) {
    await this.findOne(id);
    await removerArquivoFoto(FOTOS_DIR, id);
    return this.prisma.fichaCasal.update({ where: { id }, data: { fotoUrl: null } });
  }

  async streamFoto(id: string) {
    const foto = await encontrarFoto(FOTOS_DIR, id);
    if (!foto) throw new NotFoundException('Essa ficha de casal não tem foto');
    return { stream: streamArquivoFoto(foto.caminho), mimetype: foto.mimetype };
  }

  // Histórico de equipes servidas — mesmo critério da Ficha do Jovem (ver
  // FichasService.historicoEquipes): dado gerado pelo módulo Montagem (Alocacao), não
  // armazenado na FichaCasal.
  async historicoEquipes(id: string) {
    await this.findOne(id);
    return this.prisma.alocacao.findMany({
      where: { fichaCasalId: id },
      include: {
        vagaMontagem: {
          include: { equipe: true, cargo: true, montagem: { select: { numeroEncontro: true, data: true, status: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
