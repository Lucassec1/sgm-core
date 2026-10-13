'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CirculoBadge } from '@/components/fichas/circulo-badge';
import { useHistoricoEquipes } from '@/lib/hooks/use-fichas';
import { useHistoricoEquipesCasal } from '@/lib/hooks/use-fichas-casais';
import { fotoSrc } from '@/lib/utils';
import type { Ficha, FichaCasal, HistoricoEquipeItem } from '@/lib/types';

export interface ResumoHistorico {
  vezesServidas: number;
  porEquipe: { nome: string; vezes: number }[];
  podeCoordenar: string[];
  podePalestrar: boolean;
}

// Só conta encontros já finalizados com convite aceito — mesmo critério da R2
// (AlocacoesService: status ACEITO, fora da montagem atual), sem contar a montagem em andamento.
// A avaliação (pode coordenar/palestrar) é dada por alocação depois do encontro; "pode coordenar"
// vale pra equipe daquela alocação, por isso vira a lista de equipes.
export function resumirHistorico(itens: HistoricoEquipeItem[]): ResumoHistorico {
  const servidos = itens.filter(
    (i) => i.status === 'ACEITO' && i.vagaMontagem.montagem.status === 'FINALIZADA',
  );
  const contagem = new Map<string, number>();
  for (const i of servidos) {
    const nome = i.vagaMontagem.equipe.nome;
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  return {
    vezesServidas: servidos.length,
    porEquipe: [...contagem]
      .map(([nome, vezes]) => ({ nome, vezes }))
      .sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome)),
    podeCoordenar: [
      ...new Set(servidos.filter((i) => i.podeCoordenar).map((i) => i.vagaMontagem.equipe.nome)),
    ],
    podePalestrar: servidos.some((i) => i.podePalestrar),
  };
}

function HistoricoResumo({ itens }: { itens: HistoricoEquipeItem[] | undefined }) {
  if (!itens) return <p className="text-xs text-muted-foreground">Carregando histórico...</p>;

  const resumo = resumirHistorico(itens);
  if (resumo.vezesServidas === 0) {
    return <p className="text-xs text-muted-foreground">Ainda não serviu em nenhum encontro.</p>;
  }

  return (
    <div className="space-y-1.5 text-xs">
      <p>
        <span className="font-medium">
          Serviu {resumo.vezesServidas} {resumo.vezesServidas === 1 ? 'vez' : 'vezes'}
        </span>
        <span className="text-muted-foreground">
          {' · '}
          {resumo.porEquipe.map((e) => `${e.nome} ${e.vezes}x`).join(', ')}
        </span>
      </p>
      {(resumo.podeCoordenar.length > 0 || resumo.podePalestrar) && (
        <div className="flex flex-wrap gap-1">
          {resumo.podeCoordenar.length > 0 && (
            <Badge
              variant="outline"
              className="border-transparent bg-green-50 text-green-700 font-medium dark:bg-green-950 dark:text-green-400"
            >
              Pode coordenar: {resumo.podeCoordenar.join(', ')}
            </Badge>
          )}
          {resumo.podePalestrar && (
            <Badge
              variant="outline"
              className="border-transparent bg-blue-50 text-blue-700 font-medium dark:bg-blue-950 dark:text-blue-400"
            >
              Pode palestrar
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Montados só dentro do PopoverContent (que só existe aberto) — o histórico é buscado ao abrir,
// não pra cada nome da lista.
function HistoricoFicha({ fichaId }: { fichaId: string }) {
  const { data } = useHistoricoEquipes(fichaId);
  return <HistoricoResumo itens={data} />;
}

function HistoricoCasal({ fichaCasalId }: { fichaCasalId: string }) {
  const { data } = useHistoricoEquipesCasal(fichaCasalId);
  return <HistoricoResumo itens={data} />;
}

// Popover de pré-visualização (docs/ux-e-fluxos.md, seção 3) — evita abrir a ficha completa
// toda hora durante a montagem: foto, telefone, círculo/encontro, quantas vezes serviu e o
// resumo da avaliação (reaproveita o endpoint de histórico de equipes da Ficha, já isolado por
// paróquia — R7).
export function PessoaPreviewPopover({
  ficha,
  fichaCasal,
  children,
}: {
  ficha?: Ficha | null;
  fichaCasal?: FichaCasal | null;
  children: React.ReactNode;
}) {
  if (!ficha && !fichaCasal) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="block w-full truncate text-left hover:underline underline-offset-2"
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        {ficha && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={fotoSrc(ficha.fotoUrl)} alt={ficha.nomeCompleto} />
                <AvatarFallback>{ficha.nomeCompleto.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-tight">{ficha.nomeCompleto}</p>
                <p className="text-xs text-muted-foreground">{ficha.telefone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CirculoBadge cor={ficha.corCirculo} />
              <span>{ficha.numeroEncontro}º Encontro</span>
            </div>
            <HistoricoFicha fichaId={ficha.id} />
            <Link href={`/fichas/${ficha.id}`} className="text-xs text-primary hover:underline">
              Ver ficha completa
            </Link>
          </div>
        )}
        {fichaCasal && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={fotoSrc(fichaCasal.fotoUrl)} alt={fichaCasal.nomeEle} />
                <AvatarFallback>{fichaCasal.nomeEle.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-tight">
                  {fichaCasal.nomeEle} e {fichaCasal.nomeEla}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fichaCasal.telefoneEle} · {fichaCasal.telefoneEla}
                </p>
              </div>
            </div>
            <HistoricoCasal fichaCasalId={fichaCasal.id} />
            <Link
              href={`/fichas/casais/${fichaCasal.id}`}
              className="text-xs text-primary hover:underline"
            >
              Ver ficha completa
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
