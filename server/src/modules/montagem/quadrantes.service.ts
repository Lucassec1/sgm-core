import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';
import { deleteObject, getObject, putObject } from '../../common/uploads/s3-storage';

// Aba Quadrantes (docs/requisitos.md, 2.3): PDFs anexados à montagem. O binário vai pro S3
// (PDFs de 55-70 páginas — MB demais pro banco, e disco local não sobrevive a redeploy em
// hospedagem com filesystem efêmero); o banco guarda só metadados. Chave: `quadrantes/<montagemId>/<armazenadoComo>`.
const MAX_BYTES = 50 * 1024 * 1024;

function chave(montagemId: string, armazenadoComo: string): string {
  return `quadrantes/${montagemId}/${armazenadoComo}`;
}

export interface ArquivoRecebido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class QuadrantesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logAtividade: LogAtividadeService,
  ) {}

  private async garantirMontagem(montagemId: string) {
    const montagem = await this.prisma.montagem.findUnique({ where: { id: montagemId } });
    if (!montagem) throw new NotFoundException(`Montagem ${montagemId} não encontrada`);
  }

  async listar(montagemId: string) {
    await this.garantirMontagem(montagemId);
    return this.prisma.quadranteArquivo.findMany({
      where: { montagemId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adicionar(montagemId: string, arquivo: ArquivoRecebido | undefined, usuario?: string) {
    await this.garantirMontagem(montagemId);
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado (campo "file")');
    if (arquivo.mimetype !== 'application/pdf')
      throw new BadRequestException('Só PDF é aceito nos Quadrantes');
    if (arquivo.size > MAX_BYTES) throw new BadRequestException('Arquivo acima de 50 MB');

    const armazenadoComo = `${randomUUID()}.pdf`;
    await putObject(chave(montagemId, armazenadoComo), arquivo.buffer, arquivo.mimetype);

    const registro = await this.prisma.quadranteArquivo.create({
      data: {
        montagemId,
        nomeOriginal: arquivo.originalname,
        armazenadoComo,
        mimeType: arquivo.mimetype,
        tamanhoBytes: arquivo.size,
        usuario: usuario?.trim() || null,
      },
    });

    await this.logAtividade.registrar(
      montagemId,
      usuario,
      'ADICIONOU_QUADRANTE',
      arquivo.originalname,
    );
    return registro;
  }

  async paraDownload(montagemId: string, id: string) {
    const registro = await this.prisma.quadranteArquivo.findUnique({ where: { id } });
    if (!registro || registro.montagemId !== montagemId) {
      throw new NotFoundException(`Quadrante ${id} não encontrado na montagem ${montagemId}`);
    }
    const objeto = await getObject(chave(montagemId, registro.armazenadoComo));
    if (!objeto) throw new NotFoundException(`Arquivo do quadrante ${id} não encontrado`);
    return { registro, stream: objeto.stream };
  }

  async remover(montagemId: string, id: string, usuario?: string) {
    const registro = await this.prisma.quadranteArquivo.findUnique({ where: { id } });
    if (!registro || registro.montagemId !== montagemId) {
      throw new NotFoundException(`Quadrante ${id} não encontrado na montagem ${montagemId}`);
    }
    await deleteObject(chave(montagemId, registro.armazenadoComo));
    await this.prisma.quadranteArquivo.delete({ where: { id } });
    await this.logAtividade.registrar(
      montagemId,
      usuario,
      'REMOVEU_QUADRANTE',
      registro.nomeOriginal,
    );
    return registro;
  }
}
