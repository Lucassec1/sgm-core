'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CirculoBadge } from '@/components/fichas/circulo-badge';
import {
  useCandidatosCasaisGeral,
  useCandidatosJovensGeral,
  useCreateListaSubstituicaoItem,
} from '@/lib/hooks/use-montagens';
import type { Alocacao, ListaSubstituicaoItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PessoaPreviewPopover } from './pessoa-preview-popover';

// Quem está no encontro de algum jeito não aparece aqui: ocupando vaga, ou que saiu (essas estão
// em "Pessoas que desistiram"). Quem foi SUBSTITUIDO saiu da vaga e volta a ficar disponível.
const STATUS_NO_ENCONTRO = ['RASCUNHO', 'CONVIDADO', 'ACEITO', 'RECUSADO', 'DESISTIU'];
const POR_PAGINA = 50;

type Filtro = 'TODOS' | 'JOVEM' | 'CASAL';
const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'JOVEM', label: 'Jovens' },
  { valor: 'CASAL', label: 'Casais' },
];

interface Pessoa {
  id: string;
  tipo: 'JOVEM' | 'CASAL';
  nome: string;
  // Encontro em que o jovem vivenciou ('SEMENTEIRA' pra quem vivenciou na madrinha); casal não tem.
  encontro?: string;
  render: React.ReactNode;
}

const TODOS_ENCONTROS = 'todos';
const SEMENTEIRA = 'SEMENTEIRA';

// Nomes que não estão na montagem — fichas ativas fora de qualquer vaga e fora da lista de
// substituição, na ordem de prioridade de convite (R5: quem vivenciou o encontro anterior
// primeiro). Daqui a pessoa pode ir pra lista de substituição.
export function ForaDaMontagemSection({
  montagemId,
  alocacoes,
  lista,
  readOnly = false,
}: {
  montagemId: string;
  alocacoes: Alocacao[];
  lista: ListaSubstituicaoItem[];
  readOnly?: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [encontro, setEncontro] = useState(TODOS_ENCONTROS);
  const [limite, setLimite] = useState(POR_PAGINA);
  const jovens = useCandidatosJovensGeral(montagemId);
  const casais = useCandidatosCasaisGeral(montagemId);
  const adicionar = useCreateListaSubstituicaoItem(montagemId);

  const fora = new Set([
    ...alocacoes
      .filter((a) => STATUS_NO_ENCONTRO.includes(a.status))
      .map((a) => a.fichaId ?? a.fichaCasalId ?? ''),
    ...lista.map((i) => i.fichaId ?? i.fichaCasalId ?? ''),
  ]);

  const pessoas: Pessoa[] = [
    ...(jovens.data ?? [])
      .filter((f) => !fora.has(f.id))
      .map((f) => ({
        id: f.id,
        tipo: 'JOVEM' as const,
        nome: f.nomeCompleto,
        encontro: f.sementeiraDeId ? SEMENTEIRA : String(f.numeroEncontro),
        render: (
          <span className="flex flex-wrap items-center gap-2">
            <PessoaPreviewPopover ficha={f}>{f.nomeCompleto}</PessoaPreviewPopover>
            <CirculoBadge cor={f.corCirculo} />
            <span className="text-xs tabular-nums text-muted-foreground">
              {f.sementeiraDeId ? 'Sementeira' : `${f.numeroEncontro}º Encontro`}
            </span>
          </span>
        ),
      })),
    ...(casais.data ?? [])
      .filter((c) => !fora.has(c.id))
      .map((c) => ({
        id: c.id,
        tipo: 'CASAL' as const,
        nome: `${c.nomeEle} e ${c.nomeEla}`,
        render: (
          <span className="flex flex-wrap items-center gap-2">
            <PessoaPreviewPopover fichaCasal={c}>
              {c.nomeEle} e {c.nomeEla}
            </PessoaPreviewPopover>
            <span className="text-xs text-muted-foreground">Casal</span>
          </span>
        ),
      })),
  ];

  // Opções do filtro de encontro: os que aparecem na lista, do mais recente pro mais antigo,
  // com a sementeira por último.
  const encontros = [...new Set(pessoas.flatMap((p) => (p.encontro ? [p.encontro] : [])))].sort(
    (a, b) => (a === SEMENTEIRA ? 1 : b === SEMENTEIRA ? -1 : Number(b) - Number(a)),
  );

  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const visiveis = pessoas.filter(
    (p) =>
      (filtro === 'TODOS' || p.tipo === filtro) &&
      (encontro === TODOS_ENCONTROS || p.encontro === encontro) &&
      (!termo || p.nome.toLocaleLowerCase('pt-BR').includes(termo)),
  );

  async function paraLista(p: Pessoa) {
    try {
      await adicionar.mutateAsync({
        tipoPessoa: p.tipo,
        ...(p.tipo === 'JOVEM' ? { fichaId: p.id } : { fichaCasalId: p.id }),
      });
      toast.success(`${p.nome} entrou na lista de substituição.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar à lista.');
    }
  }

  const carregando = jovens.isLoading || casais.isLoading;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-bold">Nomes que não estão na montagem</h2>
        <p className="text-sm text-muted-foreground">
          Fichas ativas fora de qualquer vaga e da lista de substituição, na ordem de prioridade de
          convite: quem vivenciou o encontro anterior vem primeiro (R5).
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setLimite(POR_PAGINA);
            }}
            placeholder="Buscar por nome…"
            aria-label="Buscar nos nomes que não estão na montagem"
            autoComplete="off"
            className="pl-8"
          />
        </div>
        <div className="flex gap-1" role="group" aria-label="Filtrar por tipo">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={filtro === f.valor}
              onClick={() => {
                setFiltro(f.valor);
                setLimite(POR_PAGINA);
              }}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filtro === f.valor
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Select
          value={encontro}
          onValueChange={(v) => {
            setEncontro(v);
            setLimite(POR_PAGINA);
          }}
        >
          <SelectTrigger className="h-8 w-full text-xs sm:w-44" aria-label="Filtrar por encontro">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS_ENCONTROS}>Todos os encontros</SelectItem>
            {encontros.map((e) => (
              <SelectItem key={e} value={e}>
                {e === SEMENTEIRA ? 'Sementeira' : `${e}º Encontro`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs tabular-nums text-muted-foreground sm:ml-auto">
          {visiveis.length} {visiveis.length === 1 ? 'nome' : 'nomes'}
        </span>
      </div>

      {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!carregando && visiveis.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {pessoas.length === 0
            ? 'Todas as fichas ativas já estão na montagem ou na lista de substituição.'
            : 'Ninguém com esse nome fora da montagem.'}
        </p>
      )}

      {visiveis.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {visiveis.slice(0, limite).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">{p.render}</div>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => paraLista(p)}
                  disabled={adicionar.isPending}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Adicionar à lista
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {visiveis.length > limite && (
        <Button variant="ghost" size="sm" onClick={() => setLimite((l) => l + POR_PAGINA)}>
          Mostrar mais {Math.min(POR_PAGINA, visiveis.length - limite)}
        </Button>
      )}
    </section>
  );
}
