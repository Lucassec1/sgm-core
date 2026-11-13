'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { ImplantacaoMinha } from '@/lib/api/implantacoes';
import {
  useLiberacoes,
  useLiberarFicha,
  useMinhasImplantacoes,
  useRemoverLiberacao,
} from '@/lib/hooks/use-implantacoes';

type Pessoa = { fichaId?: string; fichaCasalId?: string };

// Acompanhamento da implantação: a madrinha cede uma ficha sua para as montagens da afilhada
// ("um jovem aqui e ali"). Só aparece com vínculo nessa fase.
export function LiberarFichaButton(pessoa: Pessoa) {
  const { data: minhas } = useMinhasImplantacoes();
  const emAcompanhamento = minhas?.filter((i) => i.fase === 'ACOMPANHAMENTO') ?? [];
  if (emAcompanhamento.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {emAcompanhamento.map((i) => (
        <BotaoLiberacao key={i.id} implantacao={i} pessoa={pessoa} />
      ))}
    </div>
  );
}

function BotaoLiberacao({
  implantacao,
  pessoa,
}: {
  implantacao: ImplantacaoMinha;
  pessoa: Pessoa;
}) {
  const { data: liberacoes } = useLiberacoes(implantacao.id);
  const liberar = useLiberarFicha(implantacao.id);
  const remover = useRemoverLiberacao(implantacao.id);
  const liberacao = liberacoes?.find((l) =>
    pessoa.fichaId ? l.fichaId === pessoa.fichaId : l.fichaCasalId === pessoa.fichaCasalId,
  );
  const nome = implantacao.afilhada.nome;

  const alternar = async () => {
    try {
      if (liberacao) {
        await remover.mutateAsync(liberacao.id);
        toast.success(`Liberação para ${nome} desfeita.`);
      } else {
        await liberar.mutateAsync(pessoa);
        toast.success(`Liberada para ${nome}: já aparece nas montagens dela.`);
      }
    } catch {
      toast.error('Não foi possível atualizar a liberação.');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={alternar}
      disabled={liberar.isPending || remover.isPending}
    >
      {liberacao ? `Desfazer liberação para ${nome}` : `Liberar para ${nome}`}
    </Button>
  );
}
