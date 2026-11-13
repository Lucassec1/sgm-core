import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Sexo, StatusConvite } from '@prisma/client';
import { filtroElegiveis, pessoasElegiveis } from './pessoas-elegiveis';
import { PrismaService } from '../../prisma/prisma.service';
import { buscarMontagemComVagas } from './montagem-da-paroquia';

// Sugestões da montagem: coordenadores (R3) e candidatos por vaga (R5, com as badges de R1/R2).
// Saiu do MontagensService (fase 2) — mesma lógica.
@Injectable()
export class SugestoesMontagemService {
  constructor(private readonly prisma: PrismaService) {}

  // R3 — sugestão de coordenadores. Desde 14/10/2026 R3 não bloqueia (só avisa), então a lista
  // traz todo mundo, em três grupos:
  // - Grupo A: já serviu (aceito) como equipista nessa equipe — quem foi avaliado como "pode
  //   coordenar" nela vem primeiro (`avaliadoPodeCoordenar`);
  // - Grupo B: já foi Equipe Dirigente ou Comando Geral;
  // - outros: as demais fichas ativas da paróquia (escolher alguém daqui gera aviso de R3).
  // Tudo filtrado pela paróquia da montagem (R7).
  async coordenadoresSugeridos(montagemId: string, equipeId: string, paroquiaId: string) {
    await buscarMontagemComVagas(this.prisma, montagemId, paroquiaId);
    const equipe = await this.prisma.equipe.findUnique({ where: { id: equipeId } });
    if (!equipe) {
      throw new NotFoundException(`Equipe ${equipeId} não encontrada`);
    }
    const comandoGeral = await this.prisma.equipe.findUnique({ where: { slug: 'comando-geral' } });

    const serviuNaEquipe = {
      some: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId } },
    };
    const serviuNoComandoGeral = comandoGeral
      ? { some: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId: comandoGeral.id } } }
      : undefined;
    // Avaliações "pode coordenar" dadas nas alocações dessa equipe — só pra ordenar o Grupo A.
    const avaliacoesNaEquipe = {
      where: { status: StatusConvite.ACEITO, vagaMontagem: { equipeId }, podeCoordenar: true },
      select: { id: true },
    };
    const ativas = { paroquiaId, situacao: 'ATIVA' as const };

    const [fichas, fichasCasais] = await Promise.all([
      this.prisma.ficha.findMany({
        where: ativas,
        include: { alocacoes: avaliacoesNaEquipe },
        orderBy: { nomeCompleto: 'asc' },
      }),
      this.prisma.fichaCasal.findMany({
        where: ativas,
        include: { alocacoes: avaliacoesNaEquipe },
        orderBy: { nomeEle: 'asc' },
      }),
    ]);
    const soId = { select: { id: true } } as const;
    const [grupoAFichas, grupoACasais, comandoGeralFichas, comandoGeralCasais] = await Promise.all([
      this.prisma.ficha.findMany({ where: { ...ativas, alocacoes: serviuNaEquipe }, ...soId }),
      this.prisma.fichaCasal.findMany({ where: { ...ativas, alocacoes: serviuNaEquipe }, ...soId }),
      serviuNoComandoGeral
        ? this.prisma.ficha.findMany({
            where: { ...ativas, alocacoes: serviuNoComandoGeral },
            ...soId,
          })
        : Promise.resolve([]),
      serviuNoComandoGeral
        ? this.prisma.fichaCasal.findMany({
            where: { ...ativas, alocacoes: serviuNoComandoGeral },
            ...soId,
          })
        : Promise.resolve([]),
    ]);
    const ids = (linhas: { id: string }[]) => new Set(linhas.map((l) => l.id));
    const [idsGrupoA, idsGrupoACasais, idsComandoGeral, idsComandoGeralCasais] = [
      ids(grupoAFichas),
      ids(grupoACasais),
      ids(comandoGeralFichas),
      ids(comandoGeralCasais),
    ];

    const [vezesFichas, vezesCasais] = await Promise.all([
      this.vezesNaEquipe(equipeId, montagemId, 'fichaId'),
      this.vezesNaEquipe(equipeId, montagemId, 'fichaCasalId'),
    ]);

    const separar = <
      T extends { id: string; jaFoiEquipeDirigente: boolean; alocacoes: { id: string }[] },
    >(
      itens: T[],
      grupoA: Set<string>,
      comandoGeralIds: Set<string>,
      vezes: Map<string, number>,
    ) => {
      const semAvaliacoes = (i: T) => {
        const { alocacoes, ...resto } = i;
        return {
          ...resto,
          avaliadoPodeCoordenar: alocacoes.length > 0,
          vezesNaEquipe: vezes.get(i.id) ?? 0,
        };
      };
      const a = itens
        .filter((i) => grupoA.has(i.id))
        .map(semAvaliacoes)
        .sort((x, y) => Number(y.avaliadoPodeCoordenar) - Number(x.avaliadoPodeCoordenar));
      const b = itens
        .filter((i) => !grupoA.has(i.id) && (i.jaFoiEquipeDirigente || comandoGeralIds.has(i.id)))
        .map(semAvaliacoes);
      const naoSugeridos = new Set([...a, ...b].map((i) => i.id));
      const outros = itens.filter((i) => !naoSugeridos.has(i.id)).map(semAvaliacoes);
      return { a, b, outros };
    };

    const jovens = separar(fichas, idsGrupoA, idsComandoGeral, vezesFichas);
    const casais = separar(fichasCasais, idsGrupoACasais, idsComandoGeralCasais, vezesCasais);

    return {
      grupoA: { fichas: jovens.a, fichasCasais: casais.a },
      grupoB: { fichas: jovens.b, fichasCasais: casais.b },
      outros: { fichas: jovens.outros, fichasCasais: casais.outros },
    };
  }

  // R5 — prioridade de convite: 1º jovens do encontro imediatamente anterior, depois os
  // demais em ordem decrescente. Fichas inativas não entram. Quem recusou/desistiu desta
  // montagem entra no fim, marcado (`recusouNesteEncontro`) — R1 avisa, não bloqueia. `vagaMontagemId`, quando informado, filtra também por sexo compatível com a
  // vaga (VagaMontagem.quantidadeRapazes/quantidadeMocas — ver docs/requisitos.md, 2.2).
  async candidatosJovens(montagemId: string, paroquiaId: string, vagaMontagemId?: string) {
    const montagem = await buscarMontagemComVagas(this.prisma, montagemId, paroquiaId);

    let sexos: Sexo[] | undefined;
    const vaga = vagaMontagemId ? this.vagaDaMontagem(montagem, vagaMontagemId) : undefined;
    // Vaga de anexo com "N jovens" sem sexo definido aceita qualquer um — não filtra.
    if (vaga && !vaga.quantidadeJovens) {
      sexos = [
        ...(vaga.quantidadeRapazes > 0 ? [Sexo.RAPAZ] : []),
        ...(vaga.quantidadeMocas > 0 ? [Sexo.MOCA] : []),
      ];
    }

    const elegiveis = await pessoasElegiveis(this.prisma, montagem);
    const [idsSaidas, vezes, fichas] = await Promise.all([
      this.idsQueSairam(montagemId, 'fichaId'),
      vaga ? this.vezesNaEquipe(vaga.equipeId, montagemId, 'fichaId') : Promise.resolve(null),
      this.prisma.ficha.findMany({
        where: {
          ...filtroElegiveis(elegiveis, 'fichaIds'),
          situacao: 'ATIVA',
          ...(sexos && { sexo: { in: sexos } }),
        },
        include: {
          paroquia: { select: { id: true, nome: true } },
          sementeiraDe: { select: { afilhadaId: true } },
        },
      }),
    ]);

    // R5 — quem vivenciou como sementeira (na madrinha) e já é da afilhada conta como anterior
    // ao I encontro dela: numeroEncontro efetivo 0, não o número do encontro da madrinha.
    const encontroDe = (f: (typeof fichas)[number]) =>
      f.sementeiraDe && f.sementeiraDe.afilhadaId === f.paroquiaId ? 0 : f.numeroEncontro;
    const encontroAnterior = montagem.numeroEncontro - 1;
    return fichas
      .map(({ paroquia, sementeiraDe, ...f }) => ({
        ...f,
        numeroEncontroEfetivo: encontroDe({ ...f, paroquia, sementeiraDe }),
        paroquiaOrigem: paroquia,
        recusouNesteEncontro: idsSaidas.has(f.id),
        vezesNaEquipe: vezes?.get(f.id) ?? 0,
      }))
      .sort((a, b) => {
        if (a.recusouNesteEncontro !== b.recusouNesteEncontro)
          return a.recusouNesteEncontro ? 1 : -1;
        const aEhAnterior = a.numeroEncontroEfetivo === encontroAnterior;
        const bEhAnterior = b.numeroEncontroEfetivo === encontroAnterior;
        if (aEhAnterior !== bEhAnterior) return aEhAnterior ? -1 : 1;
        return b.numeroEncontroEfetivo - a.numeroEncontroEfetivo;
      })
      .map(({ numeroEncontroEfetivo: _, ...f }) => f);
  }

  // Casais candidatos a uma vaga — mesmo formato dos jovens (recusou neste encontro, vezes que
  // já serviu na equipe da vaga) pra badge na busca; ordem alfabética, recusados no fim.
  async candidatosCasais(montagemId: string, paroquiaId: string, vagaMontagemId?: string) {
    const montagem = await buscarMontagemComVagas(this.prisma, montagemId, paroquiaId);
    const vaga = vagaMontagemId ? this.vagaDaMontagem(montagem, vagaMontagemId) : undefined;

    const elegiveis = await pessoasElegiveis(this.prisma, montagem);
    const [idsSaidas, vezes, casais] = await Promise.all([
      this.idsQueSairam(montagemId, 'fichaCasalId'),
      vaga ? this.vezesNaEquipe(vaga.equipeId, montagemId, 'fichaCasalId') : Promise.resolve(null),
      this.prisma.fichaCasal.findMany({
        where: { ...filtroElegiveis(elegiveis, 'fichaCasalIds'), situacao: 'ATIVA' },
        include: { paroquia: { select: { id: true, nome: true } } },
        orderBy: { nomeEle: 'asc' },
      }),
    ]);

    return casais
      .map(({ paroquia, ...c }) => ({
        ...c,
        paroquiaOrigem: paroquia,
        recusouNesteEncontro: idsSaidas.has(c.id),
        vezesNaEquipe: vezes?.get(c.id) ?? 0,
      }))
      .sort((a, b) => Number(a.recusouNesteEncontro) - Number(b.recusouNesteEncontro));
  }

  private vagaDaMontagem(
    montagem: {
      vagas: {
        id: string;
        equipeId: string;
        quantidadeRapazes: number;
        quantidadeMocas: number;
        quantidadeJovens?: number;
      }[];
    },
    vagaMontagemId: string,
  ) {
    const vaga = montagem.vagas.find((v) => v.id === vagaMontagemId);
    if (!vaga) {
      throw new BadRequestException(`Vaga ${vagaMontagemId} não pertence à montagem`);
    }
    return vaga;
  }

  // R1 — quem recusou/desistiu nesta montagem.
  private async idsQueSairam(montagemId: string, campo: 'fichaId' | 'fichaCasalId') {
    const saidas = await this.prisma.alocacao.findMany({
      where: {
        vagaMontagem: { montagemId },
        status: { in: [StatusConvite.RECUSADO, StatusConvite.DESISTIU] },
        [campo]: { not: null },
      },
      select: { [campo]: true },
    });
    return new Set(
      saidas
        .map((a) => (a as Record<string, string | null>)[campo])
        .filter((id): id is string => !!id),
    );
  }

  // R2 — quantas vezes cada pessoa já serviu (aceito) na equipe, em outros encontros.
  private async vezesNaEquipe(
    equipeId: string,
    montagemId: string,
    campo: 'fichaId' | 'fichaCasalId',
  ) {
    const servicos = await this.prisma.alocacao.findMany({
      where: {
        status: StatusConvite.ACEITO,
        vagaMontagem: { equipeId, montagemId: { not: montagemId } },
        [campo]: { not: null },
      },
      select: { [campo]: true },
    });
    const vezes = new Map<string, number>();
    for (const s of servicos) {
      const id = (s as Record<string, string | null>)[campo];
      if (id) vezes.set(id, (vezes.get(id) ?? 0) + 1);
    }
    return vezes;
  }
}
