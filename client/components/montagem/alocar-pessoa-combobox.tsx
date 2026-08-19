'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
import { ApiError } from '@/lib/api-client';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { useCandidatosJovens, useCoordenadoresSugeridos, useCreateAlocacao, useDeleteAlocacao } from '@/lib/hooks/use-montagens';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import type { Alocacao, StatusConvite, VagaMontagem } from '@/lib/types';

interface RepeticaoConflito {
  pessoaId: string;
  message: string;
}

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
// - R2 (repetição de equipe) chega como 409 estruturado e vira um Alert Dialog de confirmação
//   consciente — essa sim é uma regra imutável, exige decisão explícita.
// - R1/R3 (bloqueio real) e outros erros chegam como 403/outros e só avisam por toast. Pra
//   vaga de Coordenação, a busca já mostra só quem pode coordenar (Grupo A/B do R3) — não dá
//   pra escolher alguém que a regra vai barrar de qualquer jeito.
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
  const [conflito, setConflito] = useState<RepeticaoConflito | null>(null);
  const [movimentacaoPendente, setMovimentacaoPendente] = useState<MovimentacaoPendente | null>(null);

  const createAlocacao = useCreateAlocacao(montagemId);
  const deleteAlocacao = useDeleteAlocacao(montagemId);
  const candidatosJovens = useCandidatosJovens(
    montagemId,
    tipoPessoa === 'JOVEM' && !ehCoordenacao ? vagaMontagemId : undefined,
  );
  const candidatosCasais = useFichasCasais(
    { paroquiaId: PAROQUIA_ID_PROVISORIA, situacao: 'ATIVA', pageSize: 200 },
    { enabled: tipoPessoa === 'CASAL' && !ehCoordenacao },
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

  // Vaga de Coordenação: só Grupo A (já serviu nessa equipe) / Grupo B (já foi Equipe
  // Dirigente/Comando Geral) aparecem — R3 é bloqueio real, não vale oferecer quem a regra
  // vai barrar de qualquer jeito. Fora disso, lista normal de candidatos da vaga.
  const opcoesBase = ehCoordenacao
    ? tipoPessoa === 'JOVEM'
      ? [
          ...(coordenadores.data?.grupoA.fichas ?? []).map((f) => ({ id: f.id, nome: f.nomeCompleto, grupo: 'A' as const })),
          ...(coordenadores.data?.grupoB.fichas ?? []).map((f) => ({ id: f.id, nome: f.nomeCompleto, grupo: 'B' as const })),
        ]
      : [
          ...(coordenadores.data?.grupoA.fichasCasais ?? []).map((c) => ({
            id: c.id,
            nome: `${c.nomeEle} e ${c.nomeEla}`,
            grupo: 'A' as const,
          })),
          ...(coordenadores.data?.grupoB.fichasCasais ?? []).map((c) => ({
            id: c.id,
            nome: `${c.nomeEle} e ${c.nomeEla}`,
            grupo: 'B' as const,
          })),
        ]
    : tipoPessoa === 'JOVEM'
      ? (candidatosJovens.data ?? []).map((f) => ({ id: f.id, nome: f.nomeCompleto, grupo: undefined }))
      : (candidatosCasais.data?.items ?? []).map((c) => ({ id: c.id, nome: `${c.nomeEle} e ${c.nomeEla}`, grupo: undefined }));

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
      setMovimentacaoPendente({ pessoaId, nome, equipeAtual: nomeEquipeDaVaga(antiga.vagaMontagemId) });
      setOpen(false);
      return;
    }
    alocar(pessoaId, nome);
  }

  async function alocar(pessoaId: string, nome: string, confirmarRepeticao?: boolean) {
    const antiga = alocacaoAtualDaPessoa(pessoaId);

    try {
      const nova = await createAlocacao.mutateAsync({
        vagaMontagemId,
        tipoPessoa,
        ...(tipoPessoa === 'JOVEM' ? { fichaId: pessoaId } : { fichaCasalId: pessoaId }),
        status: statusParaCriar(antiga?.status),
        ...(confirmarRepeticao && { confirmarRepeticao }),
      });
      setConflito(null);
      setMovimentacaoPendente(null);
      setOpen(false);

      if (antiga) {
        await deleteAlocacao.mutateAsync(antiga.id);
        toast(`${nome} movido de ${nomeEquipeDaVaga(antiga.vagaMontagemId)} para ${nomeEquipeDaVaga(vagaMontagemId)}`, {
          action: { label: 'Desfazer', onClick: () => desfazer(nova.id, antiga) },
        });
      } else {
        toast.success(`${nome} alocado(a) na vaga.`, {
          action: { label: 'Desfazer', onClick: () => deleteAlocacao.mutate(nova.id) },
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { message?: string };
        setConflito({ pessoaId, message: body.message ?? err.message });
        setOpen(false);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Não foi possível alocar essa pessoa.');
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
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
              <CommandEmpty>
                {ehCoordenacao
                  ? 'Ninguém pode coordenar essa equipe ainda (precisa já ter servido aqui ou sido Equipe Dirigente/Comando Geral).'
                  : 'Ninguém encontrado.'}
              </CommandEmpty>
              <CommandGroup>
                {opcoes.map((pessoa) => {
                  const jaAlocadaEm = alocacaoAtualDaPessoa(pessoa.id);
                  return (
                    <CommandItem
                      key={pessoa.id}
                      value={pessoa.nome}
                      onSelect={() => selecionar(pessoa.id, pessoa.nome)}
                      className="py-2"
                    >
                      <div className="flex flex-col">
                        <span>{pessoa.nome}</span>
                        {pessoa.grupo === 'B' && (
                          <span className="text-xs text-muted-foreground">Já foi Equipe Dirigente/Comando Geral</span>
                        )}
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AlertDialog open={!!movimentacaoPendente} onOpenChange={(v) => !v && setMovimentacaoPendente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover pessoa de equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              {movimentacaoPendente?.nome} já está em {movimentacaoPendente?.equipeAtual}. Confirmar vai mover essa pessoa
              pra cá, tirando de lá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (movimentacaoPendente) alocar(movimentacaoPendente.pessoaId, movimentacaoPendente.nome);
              }}
            >
              Mover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!conflito} onOpenChange={(v) => !v && setConflito(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Essa pessoa já serviu nessa equipe</AlertDialogTitle>
            <AlertDialogDescription>{conflito?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const pessoa = opcoes.find((o) => o.id === conflito?.pessoaId);
                if (conflito && pessoa) alocar(conflito.pessoaId, pessoa.nome, true);
              }}
            >
              Alocar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
