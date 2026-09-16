import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogAtividadeService } from './log-atividade.service';

// Aba Quadrantes (docs/requisitos.md, 2.3): PDFs anexados à montagem. O binário vai pro
// filesystem (PDFs de 55-70 páginas — MB demais pro banco); o banco guarda só metadados.
// UPLOADS_DIR é configurável (volume em produção); em dev cai em server/uploads/.
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads', 'quadrantes');
const MAX_BYTES = 50 * 1024 * 1024;

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

    const dir = join(UPLOADS_DIR, montagemId);
    await mkdir(dir, { recursive: true });
    const armazenadoComo = `${randomUUID()}.pdf`;
    await writeFile(join(dir, armazenadoComo), arquivo.buffer);

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
    const stream = createReadStream(join(UPLOADS_DIR, montagemId, registro.armazenadoComo));
    return { registro, stream };
  }

  async remover(montagemId: string, id: string, usuario?: string) {
    const registro = await this.prisma.quadranteArquivo.findUnique({ where: { id } });
    if (!registro || registro.montagemId !== montagemId) {
      throw new NotFoundException(`Quadrante ${id} não encontrado na montagem ${montagemId}`);
    }
    await unlink(join(UPLOADS_DIR, montagemId, registro.armazenadoComo)).catch(() => undefined);
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
