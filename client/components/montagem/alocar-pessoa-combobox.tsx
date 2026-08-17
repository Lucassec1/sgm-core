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
import { useCandidatosJovens, useCreateAlocacao } from '@/lib/hooks/use-montagens';
import { useFichasCasais } from '@/lib/hooks/use-fichas-casais';

interface RepeticaoConflito {
  vagaMontagemId: string;
  tipoPessoa: 'JOVEM' | 'CASAL';
  fichaId?: string;
  fichaCasalId?: string;
  message: string;
}

// Busca de pessoa pra vaga (Command combobox) — ver docs/ux-e-fluxos.md, seção 3. R2
// (repetição de equipe) chega como 409 estruturado e vira um Alert Dialog de confirmação
// consciente, não um bloqueio silencioso; R1/R3 (bloqueio real) chegam como 403 e só
// avisam por toast, já que não há nada pra confirmar.
export function AlocarPessoaCombobox({
  montagemId,
  vagaMontagemId,
  tipoPessoa,
  label,
  idsJaAlocados,
}: {
  montagemId: string;
  vagaMontagemId: string;
  tipoPessoa: 'JOVEM' | 'CASAL';
  label: string;
  idsJaAlocados: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [conflito, setConflito] = useState<RepeticaoConflito | null>(null);

  const createAlocacao = useCreateAlocacao(montagemId);
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

  async function alocar(pessoaId: string, confirmarRepeticao?: boolean) {
    try {
      await createAlocacao.mutateAsync({
        vagaMontagemId,
        tipoPessoa,
        ...(tipoPessoa === 'JOVEM' ? { fichaId: pessoaId } : { fichaCasalId: pessoaId }),
        ...(confirmarRepeticao && { confirmarRepeticao }),
      });
      toast.success('Pessoa alocada na vaga.');
      setConflito(null);
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { message?: string };
        setConflito({
          vagaMontagemId,
          tipoPessoa,
          ...(tipoPessoa === 'JOVEM' ? { fichaId: pessoaId } : { fichaCasalId: pessoaId }),
          message: body.message ?? err.message,
        });
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
                {opcoes.map((pessoa) => (
                  <CommandItem key={pessoa.id} value={pessoa.nome} onSelect={() => alocar(pessoa.id)}>
                    {pessoa.nome}
                  </CommandItem>
                ))}
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
              onClick={() => conflito && alocar(conflito.fichaId ?? conflito.fichaCasalId ?? '', true)}
            >
              Alocar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
