'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileX, FolderOpen, Images } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api-client';
import {
  comRetentativa,
  fichasRepetidas,
  motivoRecusa,
  sugerirVinculo,
  type CandidatoFoto,
  type Vinculo,
} from '@/lib/fotos-lote';

type Tipo = 'jovem' | 'casal';

interface Linha {
  arquivo: File;
  preview: string;
  recusa: string | null;
  vinculo: Vinculo;
  fichaId: string | null;
}

type Resultado = { nome: string; ok: true } | { nome: string; ok: false; erro: string };

const TEXTOS: Record<Tipo, { exemplo: string; queryKey: string }> = {
  jovem: { exemplo: 'Maria Aparecida de Souza.jpg', queryKey: 'fichas' },
  casal: { exemplo: 'José e Ana Ribeiro.jpg', queryKey: 'fichas-casais' },
};

// Todas as fichas da paróquia (a listagem é paginada em até 100) — só o necessário pra casar nome.
async function carregarCandidatos(tipo: Tipo): Promise<CandidatoFoto[]> {
  const candidatos: CandidatoFoto[] = [];
  for (let page = 1; ; page++) {
    if (tipo === 'jovem') {
      const res = await apiClient.listFichas({ page, pageSize: 100 });
      candidatos.push(
        ...res.items.map((f) => ({ id: f.id, nome: f.nomeCompleto, temFoto: !!f.fotoUrl })),
      );
      if (page * res.pageSize >= res.total) break;
    } else {
      const res = await apiClient.listFichasCasais({ page, pageSize: 100 });
      candidatos.push(
        ...res.items.map((c) => ({
          id: c.id,
          nome: `${c.nomeEle} e ${c.nomeEla}`,
          temFoto: !!c.fotoUrl,
        })),
      );
      if (page * res.pageSize >= res.total) break;
    }
  }
  return candidatos;
}

async function enviarFoto(tipo: Tipo, id: string, arquivo: File): Promise<void> {
  if (tipo === 'jovem') await apiClient.uploadFotoFicha(id, arquivo);
  else await apiClient.uploadFotoFichaCasal(id, arquivo);
}

// Upload em lote (#59): escolhe vários arquivos (ou uma pasta), o sistema sugere a ficha de cada
// um pelo nome do arquivo e mostra tudo numa tela de conferência — nada é enviado sem a pessoa
// conferir. O envio é um por vez, pelo mesmo endpoint do upload individual (mesma validação e
// isolamento por paróquia no server), esperando quando bate no rate limit.
export function UploadFotosLoteDialog({ tipo }: { tipo: Tipo }) {
  const [aberto, setAberto] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [aguardandoLimite, setAguardandoLimite] = useState(false);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const inputArquivos = useRef<HTMLInputElement>(null);
  const inputPasta = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: candidatos, isLoading: carregando } = useQuery({
    queryKey: [TEXTOS[tipo].queryKey, 'candidatos-foto'],
    queryFn: () => carregarCandidatos(tipo),
    enabled: aberto,
    staleTime: 0,
  });
  const porId = useMemo(() => new Map((candidatos ?? []).map((c) => [c.id, c])), [candidatos]);

  // `webkitdirectory` não está nos tipos do React — liga direto no elemento.
  useEffect(() => {
    inputPasta.current?.setAttribute('webkitdirectory', '');
  }, [aberto]);

  function limpar() {
    linhas.forEach((l) => URL.revokeObjectURL(l.preview));
    setLinhas([]);
    setResultados(null);
    setProgresso(0);
  }

  function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []).filter((f) => !f.name.startsWith('.'));
    e.target.value = '';
    if (!candidatos || arquivos.length === 0) return;
    limpar();
    setLinhas(
      arquivos
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((arquivo) => {
          const recusa = motivoRecusa(arquivo);
          const vinculo: Vinculo = recusa
            ? { tipo: 'nenhum' }
            : sugerirVinculo(arquivo.name, candidatos);
          return {
            arquivo,
            preview: URL.createObjectURL(arquivo),
            recusa,
            vinculo,
            fichaId: 'candidatoId' in vinculo ? vinculo.candidatoId : null,
          };
        }),
    );
  }

  const repetidas = fichasRepetidas(linhas.map((l) => (l.recusa ? null : l.fichaId)));
  const paraEnviar = linhas.filter((l) => !l.recusa && l.fichaId);
  const recusadas = linhas.filter((l) => l.recusa).length;
  const semFicha = linhas.length - paraEnviar.length - recusadas;

  async function enviar() {
    setEnviando(true);
    const res: Resultado[] = [];
    for (const [i, linha] of paraEnviar.entries()) {
      try {
        await comRetentativa(
          () => enviarFoto(tipo, linha.fichaId as string, linha.arquivo),
          undefined,
          () => setAguardandoLimite(true),
        );
        res.push({ nome: linha.arquivo.name, ok: true });
      } catch (err) {
        res.push({
          nome: linha.arquivo.name,
          ok: false,
          erro: err instanceof Error ? err.message : 'Erro ao enviar',
        });
      }
      setAguardandoLimite(false);
      setProgresso(i + 1);
    }
    setResultados(res);
    setEnviando(false);
    queryClient.invalidateQueries({ queryKey: [TEXTOS[tipo].queryKey] });
  }

  function aoMudarAberto(novo: boolean) {
    if (enviando) return; // não fecha no meio do envio
    if (!novo) limpar();
    setAberto(novo);
  }

  const etapa = resultados
    ? 'concluido'
    : enviando
      ? 'enviando'
      : linhas.length
        ? 'conferir'
        : 'selecionar';

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Images className="h-4 w-4" />
          Fotos em lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Enviar fotos em lote</DialogTitle>
          <DialogDescription>
            Nomeie cada arquivo com o nome {tipo === 'jovem' ? 'completo da pessoa' : 'do casal'} —
            por exemplo, <span className="font-medium">{TEXTOS[tipo].exemplo}</span>. O sistema
            sugere a ficha de cada foto e você confere antes de enviar.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputArquivos}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={aoSelecionar}
          data-testid="input-arquivos"
        />
        <input ref={inputPasta} type="file" multiple className="hidden" onChange={aoSelecionar} />

        {etapa === 'selecionar' && (
          <div className="flex flex-col items-center gap-3 py-6">
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando fichas...</p>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => inputArquivos.current?.click()} className="gap-1.5">
                  <Images className="h-4 w-4" />
                  Escolher fotos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => inputPasta.current?.click()}
                  className="gap-1.5"
                >
                  <FolderOpen className="h-4 w-4" />
                  Escolher pasta
                </Button>
              </div>
            )}
          </div>
        )}

        {etapa === 'conferir' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {paraEnviar.length}{' '}
              {paraEnviar.length === 1 ? 'foto será enviada' : 'fotos serão enviadas'}
              {semFicha > 0 && ` · ${semFicha} sem ficha`}
              {recusadas > 0 && ` · ${recusadas} ${recusadas === 1 ? 'recusada' : 'recusadas'}`}
            </p>
            <ul className="divide-y rounded-md border">
              {linhas.map((linha, i) => (
                <LinhaConferencia
                  key={linha.preview}
                  linha={linha}
                  candidatos={candidatos ?? []}
                  porId={porId}
                  repetida={!!linha.fichaId && repetidas.has(linha.fichaId)}
                  onEscolher={(fichaId) =>
                    setLinhas((atual) => atual.map((l, j) => (j === i ? { ...l, fichaId } : l)))
                  }
                />
              ))}
            </ul>
          </div>
        )}

        {etapa === 'enviando' && (
          <div className="space-y-2 py-4">
            <Progress value={(progresso / paraEnviar.length) * 100} />
            <p className="text-sm text-muted-foreground">
              {progresso} de {paraEnviar.length} enviadas
              {aguardandoLimite &&
                ' — limite de envios por minuto atingido, continuando sozinho em instantes'}
            </p>
          </div>
        )}

        {etapa === 'concluido' && resultados && (
          <div className="space-y-2">
            <p className="text-sm">
              {resultados.filter((r) => r.ok).length} de {resultados.length} fotos enviadas.
            </p>
            {resultados.some((r) => !r.ok) && (
              <ul className="space-y-1 text-sm">
                {resultados
                  .filter((r): r is Extract<Resultado, { ok: false }> => !r.ok)
                  .map((r) => (
                    <li key={r.nome} className="text-red-600 dark:text-red-400">
                      {r.nome}: {r.erro}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          {etapa === 'conferir' && (
            <>
              <Button variant="ghost" onClick={limpar}>
                Escolher outros arquivos
              </Button>
              <Button onClick={enviar} disabled={paraEnviar.length === 0 || repetidas.size > 0}>
                Enviar {paraEnviar.length} {paraEnviar.length === 1 ? 'foto' : 'fotos'}
              </Button>
            </>
          )}
          {etapa === 'concluido' && <Button onClick={() => aoMudarAberto(false)}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinhaConferencia({
  linha,
  candidatos,
  porId,
  repetida,
  onEscolher,
}: {
  linha: Linha;
  candidatos: CandidatoFoto[];
  porId: Map<string, CandidatoFoto>;
  repetida: boolean;
  onEscolher: (fichaId: string | null) => void;
}) {
  const escolhida = linha.fichaId ? porId.get(linha.fichaId) : undefined;
  const sugeridaMantida =
    'candidatoId' in linha.vinculo && linha.vinculo.candidatoId === linha.fichaId;
  const opcoesAmbiguas =
    linha.vinculo.tipo === 'ambiguo' ? new Set(linha.vinculo.opcoes) : new Set<string>();

  return (
    <li className="flex items-center gap-3 p-2 text-sm">
      {linha.recusa ? (
        <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-muted">
          <FileX className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:), não passa pelo next/image
        <img src={linha.preview} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="truncate" title={linha.arquivo.name}>
          {linha.arquivo.name}
        </span>

        {linha.recusa ? (
          <Badge
            variant="outline"
            className="border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
          >
            {linha.recusa}
          </Badge>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <select
              aria-label={`Ficha de ${linha.arquivo.name}`}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground sm:w-60 dark:[color-scheme:dark]"
              value={linha.fichaId ?? ''}
              onChange={(e) => onEscolher(e.target.value || null)}
            >
              <option value="">Não enviar</option>
              {opcoesAmbiguas.size > 0 && (
                <optgroup label="Possíveis">
                  {candidatos
                    .filter((c) => opcoesAmbiguas.has(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                </optgroup>
              )}
              <optgroup label="Todas as fichas">
                {candidatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </optgroup>
            </select>
            {repetida ? (
              <Badge
                variant="outline"
                className="border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
              >
                Ficha escolhida em outra foto
              </Badge>
            ) : !linha.fichaId ? (
              <Badge
                variant="outline"
                className="border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              >
                {linha.vinculo.tipo === 'ambiguo' ? 'Escolha a ficha' : 'Sem ficha'}
              </Badge>
            ) : sugeridaMantida && linha.vinculo.tipo === 'parcial' ? (
              <Badge
                variant="outline"
                className="border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              >
                Confira
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
              >
                OK
              </Badge>
            )}
            {escolhida?.temFoto && !repetida && (
              <span className="text-xs text-muted-foreground">substitui a foto atual</span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
