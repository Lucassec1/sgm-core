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
import { useCandidatosJovens, useCreateAlocacao, useDeleteAlocacao } from '@/lib/hooks/use-montagens';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';
import type { Alocacao, StatusConvite, VagaMontagem } from '@/lib/types';

interface RepeticaoConflito {
  pessoaId: string;
  message: string;
}

const STATUS_ATIVO = ['RASCUNHO', 'CONVIDADO', 'ACEITO'];

// Preserva o status ao mover — "moveu de equipe" não deveria resetar um convite já aceito
// (ver docs/ux-e-fluxos.md, seção 3, "Busca de pessoa para preencher vaga").
function statusParaCriar(status?: StatusConvite) {
  return status && status !== 'RASCUNHO' ? (status as 'CONVIDADO' | 'ACEITO') : undefined;
}

// Busca de pessoa pra vaga (Command combobox) — ver docs/ux-e-fluxos.md, seção 3.
//
// - Se a pessoa já está alocada em OUTRA vaga desse encontro, a ação vira um remanejamento:
//   cria na vaga nova (preservando o status), remove da antiga, e avisa por Toast com Desfazer
//   — nunca um Alert Dialog, esse fluxo é comum e tem que ser leve.
// - R2 (repetição de equipe) chega como 409 estruturado e vira um Alert Dialog de confirmação
//   consciente — essa sim é uma regra imutável, exige decisão explícita.
// - R1/R3 (bloqueio real) e outros erros chegam como 403/outros e só avisam por toast.
export function AlocarPessoaCombobox({
  montagemId,
  vagaMontagemId,
  tipoPessoa,
  label,
  idsJaAlocados,
  todasVagas,
  todasAlocacoes,
}: {
  montagemId: string;
  vagaMontagemId: string;
  tipoPessoa: 'JOVEM' | 'CASAL';
  label: string;
  idsJaAlocados: Set<string>;
  todasVagas: VagaMontagem[];
  todasAlocacoes: Alocacao[];
}) {
  const [open, setOpen] = useState(false);
  const [conflito, setConflito] = useState<RepeticaoConflito | null>(null);

  const createAlocacao = useCreateAlocacao(montagemId);
  const deleteAlocacao = useDeleteAlocacao(montagemId);
  const candidatosJovens = useCandidatosJovens(montagemId, tipoPessoa === 'JOVEM' ? vagaMontagemId : undefined);
  const candidatosCasais = useFichasCasais(
    { paroquiaId: PAROQUIA_ID_PROVISORIA, situacao: 'ATIVA', pageSize: 200 },
    { enabled: tipoPessoa === 'CASAL' },
  );

  const opcoes =
    tipoPessoa === 'JOVEM'
      ? (candidatosJovens.data ?? [])
          .filter((f) => !idsJaAlocados.has(f.id))
          .map((f) => ({ id: f.id, nome: f.nomeCompleto }))
      : (candidatosCasais.data?.items ?? [])
          .filter((c) => !idsJaAlocados.has(c.id))
          .map((c) => ({ id: c.id, nome: `${c.nomeEle} e ${c.nomeEla}` }));

  function alocacaoAtualDaPessoa(pessoaId: string) {
    return todasAlocacoes.find(
      (a) =>
        STATUS_ATIVO.includes(a.status) &&
        a.vagaMontagemId !== vagaMontagemId &&
        (tipoPessoa === 'JOVEM' ? a.fichaId === pessoaId : a.fichaCasalId === pessoaId),
    );
  }

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
        <PopoverContent className="p-0 w-72" align="start">
          <Command>
            <CommandInput placeholder="Buscar por nome..." />
            <CommandList>
              <CommandEmpty>Ninguém encontrado.</CommandEmpty>
              <CommandGroup>
                {opcoes.map((pessoa) => {
                  const jaAlocadaEm = alocacaoAtualDaPessoa(pessoa.id);
                  return (
                    <CommandItem key={pessoa.id} value={pessoa.nome} onSelect={() => alocar(pessoa.id, pessoa.nome)}>
                      <div className="flex flex-col">
                        <span>{pessoa.nome}</span>
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
