'use client';

import { use, useState } from 'react';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { agruparVagasPorEquipe } from '@/lib/utils';
import { useConselhoMontagem, useConselhoObservacoes, useCriarObservacao } from '@/lib/hooks/use-conselho';
import type { Alocacao, VagaMontagem } from '@/lib/types';

// Visão read-only do Conselho (R8) — mostra TODOS os status de alocação (não só ACEITO, ao
// contrário do modo Telão, que é público e só mostra quem já aceitou de fato).
function nomeAlocacao(alocacao: Alocacao) {
  return (
    alocacao.ficha?.nomeCompleto ??
    (alocacao.fichaCasal ? `${alocacao.fichaCasal.nomeEle} e ${alocacao.fichaCasal.nomeEla}` : '—')
  );
}

export default function ConselhoMontagemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: montagem, isLoading, isError } = useConselhoMontagem(id);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !montagem) return <p className="p-6 text-sm text-red-600">Não foi possível carregar a montagem.</p>;

  const gruposPorEquipe = agruparVagasPorEquipe(montagem.vagas as VagaMontagem[]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">
          {montagem.paroquia.nome} · {montagem.numeroEncontro}º Encontro
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date(montagem.data).toLocaleDateString('pt-BR')}
          {montagem.padroeiro && ` · ${montagem.padroeiro}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {gruposPorEquipe.map((vagas) => (
          <BlocoEquipe key={vagas[0].equipeId} vagas={vagas as (VagaMontagem & { alocacoes: Alocacao[] })[]} />
        ))}
      </div>

      <ObservacoesPanel montagemId={id} />
    </div>
  );
}

function BlocoEquipe({ vagas }: { vagas: (VagaMontagem & { alocacoes: Alocacao[] })[] }) {
  const { equipe } = vagas[0];
  const cargos = [...vagas].sort((a, b) => a.cargo.ordem - b.cargo.ordem);

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <EquipeIcon slug={equipe.slug} nome={equipe.nome} size={20} />
        {equipe.nome}
      </h2>
      <div className="space-y-2">
        {cargos.map((vaga) => (
          <div key={vaga.id} className="text-sm">
            <span className="font-medium">{vaga.cargo.nome}:</span>{' '}
            {vaga.alocacoes.length > 0 ? (
              <span className="space-x-1">
                {vaga.alocacoes.map((alocacao) => (
                  <Badge key={alocacao.id} variant={alocacao.status === 'ACEITO' ? 'default' : 'secondary'}>
                    {nomeAlocacao(alocacao)}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="italic text-muted-foreground">a confirmar</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// R8 — "pode deixar observações... toda observação exibe o nome de quem a registrou". O nome
// nunca é digitado aqui: vem sempre do backend, a partir de quem está autenticado.
function ObservacoesPanel({ montagemId }: { montagemId: string }) {
  const { data: observacoes, isLoading } = useConselhoObservacoes(montagemId);
  const criarObservacao = useCriarObservacao(montagemId);
  const [texto, setTexto] = useState('');

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Observações do Conselho</h2>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {observacoes?.map((observacao) => (
          <div key={observacao.id} className="text-sm">
            <p>{observacao.texto}</p>
            <p className="text-xs text-muted-foreground">
              {observacao.usuario.nome ?? 'Conselho'} · {new Date(observacao.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
        {observacoes?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma observação registrada ainda.</p>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Deixar uma observação ou sugestão pra essa montagem..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!texto.trim() || criarObservacao.isPending}
          onClick={() => {
            criarObservacao.mutate(texto, { onSuccess: () => setTexto('') });
          }}
        >
          Enviar observação
        </Button>
      </div>
    </div>
  );
}
