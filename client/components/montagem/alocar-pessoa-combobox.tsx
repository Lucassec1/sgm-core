'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { avisosDoErro } from '@/lib/api-client';
import { AvisosRegrasDialog } from './avisos-regras-dialog';
import { BadgeAviso, avisoDeRepeticao } from './aviso-badges';
import {
  useCandidatosCasais,
  useCandidatosJovens,
  useCoordenadoresSugeridos,
  useCreateAlocacao,
  useDeleteAlocacao,
} from '@/lib/hooks/use-montagens';
import type { Alocacao, AvisoRegra, StatusConvite, VagaMontagem } from '@/lib/types';

interface AvisosPendentes {
  pessoaId: string;
  nome: string;
  avisos: AvisoRegra[];
}

// Grupo da pessoa na lista: A/B/outros (vaga de Coordenação, R3) ou comum.
type Grupo = 'A' | 'B' | 'outros' | undefined;

interface Opcao {
  id: string;
  nome: string;
  grupo: Grupo;
  avaliadoPodeCoordenar?: boolean;
  recusouNesteEncontro?: boolean;
  vezesNaEquipe?: number;
}

const TITULO_GRUPO: Record<'A' | 'B' | 'outros', string> = {
  A: 'Já serviram nesta equipe',
  B: 'Já foram Equipe Dirigente / Comando Geral',
  outros: 'Outras pessoas',
};

interface MovimentacaoPendente {
  pessoaId: string;
  nome: string;
  equipeAtual: string;
}

const STATUS_ATIVO = ['RASCUNHO', 'CONVIDADO', 'ACEITO'];

// Preserva o status ao mover — "moveu de equipe" não deveria resetar um convite já aceito
// (ver docs/ux-e-fluxos.md, seção 3, "Busca de pessoa para preencher vaga").
function statusParaCriar(status?: StatusConvite) {
  return status && status !== 'RASCUNHO' ? (status as 'CONVIDADO' | 'ACEITO') : undefined;
}

// Busca de pessoa pra vaga (Command combobox) — ver docs/ux-e-fluxos.md, seção 3.
//
// - Se a pessoa já está alocada em OUTRA vaga desse encontro, pede confirmação explícita
//   antes de mover (mostra de onde pra onde) — depois de confirmado, cria na vaga nova
//   (preservando o status), remove da antiga, e ainda avisa por Toast com Desfazer.
// - R1–R3 não bloqueiam nem pedem confirmação (decisão de 14/10/2026): viram badges aqui na
//   busca (recusou este encontro, Nª vez nesta equipe, nunca serviu nesta equipe, pode
//   coordenar) e, depois de alocar, na vaga. Só o R4 (mover alguém já convidado antes dos
//   Círculos fecharem) ainda chega como 409 e pede confirmação (AvisosRegrasDialog).
// - Vaga de Coordenação (R3): lista em três grupos — já serviu na equipe (avaliados "pode
//   coordenar" primeiro), já foi ED/Comando Geral, e as demais pessoas.
// - Sugestões priorizam quem ainda não está em nenhuma equipe desse encontro.
export function AlocarPessoaCombobox({
  montagemId,
  vagaMontagemId,
  equipeId,
  ehCoordenacao,
  tipoPessoa,
  label,
  idsJaAlocados,
  todasVagas,
  todasAlocacoes,
}: {
  montagemId: string;
  vagaMontagemId: string;
  equipeId: string;
  ehCoordenacao: boolean;
  tipoPessoa: 'JOVEM' | 'CASAL';
  label: string;
  idsJaAlocados: Set<string>;
  todasVagas: VagaMontagem[];
  todasAlocacoes: Alocacao[];
}) {
  const [open, setOpen] = useState(false);
  const [avisosPendentes, setAvisosPendentes] = useState<AvisosPendentes | null>(null);
  const [movimentacaoPendente, setMovimentacaoPendente] = useState<MovimentacaoPendente | null>(
    null,
  );

  const createAlocacao = useCreateAlocacao(montagemId);
  const deleteAlocacao = useDeleteAlocacao(montagemId);
  const candidatosJovens = useCandidatosJovens(
    montagemId,
    tipoPessoa === 'JOVEM' && !ehCoordenacao ? vagaMontagemId : undefined,
  );
  const candidatosCasais = useCandidatosCasais(
    montagemId,
    tipoPessoa === 'CASAL' && !ehCoordenacao ? vagaMontagemId : undefined,
  );
  const coordenadores = useCoordenadoresSugeridos(montagemId, ehCoordenacao ? equipeId : undefined);

  function alocacaoAtualDaPessoa(pessoaId: string) {
    return todasAlocacoes.find(
      (a) =>
        STATUS_ATIVO.includes(a.status) &&
        a.vagaMontagemId !== vagaMontagemId &&
        (tipoPessoa === 'JOVEM' ? a.fichaId === pessoaId : a.fichaCasalId === pessoaId),
    );
  }

  const nomeCasal = (c: { nomeEle: string; nomeEla: string }) => `${c.nomeEle} e ${c.nomeEla}`;
  const grupoCoordenacao = (grupo: 'A' | 'B' | 'outros'): Opcao[] => {
    const dados =
      coordenadores.data?.[grupo === 'outros' ? 'outros' : grupo === 'A' ? 'grupoA' : 'grupoB'];
    return tipoPessoa === 'JOVEM'
      ? (dados?.fichas ?? []).map((f) => ({
          id: f.id,
          nome: f.nomeCompleto,
          grupo,
          avaliadoPodeCoordenar: f.avaliadoPodeCoordenar,
          vezesNaEquipe: f.vezesNaEquipe,
        }))
      : (dados?.fichasCasais ?? []).map((c) => ({
          id: c.id,
          nome: nomeCasal(c),
          grupo,
          avaliadoPodeCoordenar: c.avaliadoPodeCoordenar,
          vezesNaEquipe: c.vezesNaEquipe,
        }));
  };

  const opcoesBase: Opcao[] = ehCoordenacao
    ? [...grupoCoordenacao('A'), ...grupoCoordenacao('B'), ...grupoCoordenacao('outros')]
    : tipoPessoa === 'JOVEM'
      ? (candidatosJovens.data ?? []).map((f) => ({
          id: f.id,
          nome: f.nomeCompleto,
          grupo: undefined,
          recusouNesteEncontro: f.recusouNesteEncontro,
          vezesNaEquipe: f.vezesNaEquipe,
        }))
      : (candidatosCasais.data ?? []).map((c) => ({
          id: c.id,
          nome: nomeCasal(c),
          grupo: undefined,
          recusouNesteEncontro: c.recusouNesteEncontro,
          vezesNaEquipe: c.vezesNaEquipe,
        }));

  // Quem ainda não está em nenhuma equipe desse encontro aparece primeiro na lista — é
  // quem mais precisa de vaga; ordenação por prioridade (R5) e busca por texto continuam
  // valendo dentro de cada grupo (sort é estável).
  const opcoes = opcoesBase
    .filter((p, i, arr) => !idsJaAlocados.has(p.id) && arr.findIndex((o) => o.id === p.id) === i)
    .sort((a, b) => Number(!!alocacaoAtualDaPessoa(a.id)) - Number(!!alocacaoAtualDaPessoa(b.id)));

  function nomeEquipeDaVaga(vId: string) {
    return todasVagas.find((v) => v.id === vId)?.equipe.nome ?? 'outra equipe';
  }

  async function desfazer(idNova: string, antiga: Alocacao) {
    try {
      await deleteAlocacao.mutateAsync(idNova);
      await createAlocacao.mutateAsync({
        vagaMontagemId: antiga.vagaMontagemId,
        tipoPessoa: antiga.tipoPessoa,
        ...(antiga.fichaId && { fichaId: antiga.fichaId }),
        ...(antiga.fichaCasalId && { fichaCasalId: antiga.fichaCasalId }),
        status: statusParaCriar(antiga.status),
      });
      toast.success('Desfeito.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível desfazer.');
    }
  }

  function selecionar(pessoaId: string, nome: string) {
    const antiga = alocacaoAtualDaPessoa(pessoaId);
    if (antiga) {
      setMovimentacaoPendente({
        pessoaId,
        nome,
        equipeAtual: nomeEquipeDaVaga(antiga.vagaMontagemId),
      });
      setOpen(false);
      return;
    }
    alocar(pessoaId, nome);
  }

  async function alocar(pessoaId: string, nome: string, confirmarAvisos?: boolean) {
    const antiga = alocacaoAtualDaPessoa(pessoaId);

    try {
      const nova = await createAlocacao.mutateAsync({
        vagaMontagemId,
        tipoPessoa,
        ...(tipoPessoa === 'JOVEM' ? { fichaId: pessoaId } : { fichaCasalId: pessoaId }),
        status: statusParaCriar(antiga?.status),
        ...(confirmarAvisos && { confirmarAvisos }),
      });
      setAvisosPendentes(null);
      setMovimentacaoPendente(null);
      setOpen(false);

      if (antiga) {
        await deleteAlocacao.mutateAsync(antiga.id);
        toast(
          `${nome} movido de ${nomeEquipeDaVaga(antiga.vagaMontagemId)} para ${nomeEquipeDaVaga(vagaMontagemId)}`,
          {
            action: { label: 'Desfazer', onClick: () => desfazer(nova.id, antiga) },
          },
        );
      } else {
        toast.success(`${nome} alocado(a) na vaga.`, {
          action: { label: 'Desfazer', onClick: () => deleteAlocacao.mutate(nova.id) },
        });
      }
    } catch (err) {
      const avisos = avisosDoErro(err);
      if (avisos) {
        setAvisosPendentes({ pessoaId, nome, avisos });
        setOpen(false);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Não foi possível alocar essa pessoa.');
    }
  }

  return (
    <>
      {/* modal: sem isso, quando este combobox abre de dentro do Drawer da equipe (um
          Radix Dialog), o scroll-lock come o wheel e a lista não rola. Com modal, o
          conteúdo do Popover entra no shard do RemoveScroll e o scroll volta. */}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar por nome..." />
            <CommandList className="max-h-[360px]">
              <CommandEmpty>Ninguém encontrado.</CommandEmpty>
              {(ehCoordenacao ? (['A', 'B', 'outros'] as const) : ([undefined] as const)).map(
                (grupo) => {
                  const doGrupo = opcoes.filter((p) => p.grupo === grupo);
                  if (doGrupo.length === 0) return null;
                  return (
                    <CommandGroup key={grupo ?? 'todos'} heading={grupo && TITULO_GRUPO[grupo]}>
                      {doGrupo.map((pessoa) => {
                        const jaAlocadaEm = alocacaoAtualDaPessoa(pessoa.id);
                        return (
                          <CommandItem
                            key={pessoa.id}
                            value={pessoa.nome}
                            onSelect={() => selecionar(pessoa.id, pessoa.nome)}
                            className="py-2"
                          >
                            <div className="flex min-w-0 flex-col gap-1">
                              <span>{pessoa.nome}</span>
                              <OpcaoBadges pessoa={pessoa} />
                              {jaAlocadaEm && (
                                <span className="text-xs text-muted-foreground">
                                  Já em: {nomeEquipeDaVaga(jaAlocadaEm.vagaMontagemId)}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  );
                },
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={!!movimentacaoPendente}
        onOpenChange={(v) => !v && setMovimentacaoPendente(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover pessoa de equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              {movimentacaoPendente?.nome} já está em {movimentacaoPendente?.equipeAtual}. Confirmar
              vai mover essa pessoa pra cá, tirando de lá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (movimentacaoPendente)
                  alocar(movimentacaoPendente.pessoaId, movimentacaoPendente.nome);
              }}
            >
              Mover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AvisosRegrasDialog
        avisos={avisosPendentes?.avisos ?? null}
        acao="Alocar mesmo assim"
        onCancelar={() => setAvisosPendentes(null)}
        onConfirmar={() => {
          if (avisosPendentes) alocar(avisosPendentes.pessoaId, avisosPendentes.nome, true);
        }}
      />
    </>
  );
}

// Badges da pessoa na busca (R1–R3 só informam — decisão de 14/10/2026): o que se vê aqui é o
// mesmo que vai aparecer na vaga depois de alocar.
function OpcaoBadges({ pessoa }: { pessoa: Opcao }) {
  const repeticao = avisoDeRepeticao(pessoa.vezesNaEquipe ?? 0);
  if (
    !pessoa.avaliadoPodeCoordenar &&
    pessoa.grupo !== 'outros' &&
    !pessoa.recusouNesteEncontro &&
    !repeticao
  ) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {pessoa.avaliadoPodeCoordenar && <BadgeAviso nivel="positivo">Pode coordenar</BadgeAviso>}
      {pessoa.grupo === 'outros' && (
        <BadgeAviso nivel="grave">Nunca serviu nesta equipe</BadgeAviso>
      )}
      {pessoa.recusouNesteEncontro && <BadgeAviso nivel="grave">Recusou este encontro</BadgeAviso>}
      {repeticao && <BadgeAviso nivel={repeticao.nivel}>{repeticao.rotulo}</BadgeAviso>}
    </div>
  );
}
