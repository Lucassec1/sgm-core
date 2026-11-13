'use client';

import { use, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlocacoes, useListaSubstituicao, useMontagem } from '@/lib/hooks/use-montagens';
import { agruparVagasPorEquipe } from '@/lib/utils';
import { ControleConvitesSection } from '@/components/montagem/controle-convites-section';
import { EditarTamanhoEncontroDialog } from '@/components/montagem/editar-tamanho-encontro-dialog';
import { EquipeCard } from '@/components/montagem/equipe-card';
import { EquipeDrawer } from '@/components/montagem/equipe-drawer';
import { FinalizarMontagemButton } from '@/components/montagem/finalizar-montagem-button';
import { ListaCompletaEquipes } from '@/components/montagem/lista-completa-equipes';
import { ListaSubstituicaoSection } from '@/components/montagem/lista-substituicao-section';
import { DesistenciasSection } from '@/components/montagem/desistencias-section';
import { ForaDaMontagemSection } from '@/components/montagem/fora-da-montagem-section';
import { LogAtividadeDrawer } from '@/components/montagem/log-atividade-drawer';
import { ObservacoesConselhoCard } from '@/components/montagem/observacoes-conselho-card';
import { OfflineBanner } from '@/components/montagem/offline-banner';
import { ResumoEncontroCard } from '@/components/montagem/resumo-encontro-card';
import type { Alocacao } from '@/lib/types';
import { MontagemStatusBadge } from '@/components/montagem/montagem-status-badge';
import { MetaLista, PageHeader } from '@/components/page-header';

export default function MontagemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: montagem, isLoading, isError } = useMontagem(id);
  const { data: alocacoes } = useAlocacoes(id);
  const { data: listaSubstituicao } = useListaSubstituicao(id);
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState<string | null>(null);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (isError || !montagem)
    return (
      <p className="p-6 text-sm text-red-600 dark:text-red-400">
        Não foi possível carregar a montagem. Confira a conexão e recarregue a página.
      </p>
    );

  const gruposPorEquipe = agruparVagasPorEquipe(montagem.vagas);
  const alocacoesPorVaga = new Map<string, Alocacao[]>();
  for (const alocacao of alocacoes ?? []) {
    const lista = alocacoesPorVaga.get(alocacao.vagaMontagemId) ?? [];
    lista.push(alocacao);
    alocacoesPorVaga.set(alocacao.vagaMontagemId, lista);
  }

  const grupoCirculos = gruposPorEquipe.find((vagas) => vagas[0].equipe.ehCirculos);
  const circulosFechado = grupoCirculos
    ? grupoCirculos.flatMap((v) => alocacoesPorVaga.get(v.id) ?? []).length > 0 &&
      grupoCirculos
        .flatMap((v) => alocacoesPorVaga.get(v.id) ?? [])
        .every((a) => a.status === 'ACEITO')
    : false;

  return (
    <div className="p-6 space-y-6">
      <OfflineBanner />

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {montagem.numeroEncontro}º Encontro
            <MontagemStatusBadge status={montagem.status} />
          </span>
        }
        description={
          <MetaLista
            itens={[
              new Date(montagem.data).toLocaleDateString('pt-BR'),
              montagem.padroeiro,
              `${montagem.numeroJovensVivenciando} jovens vivenciando`,
              montagem.anexoImplantacao &&
                `Implantação: encontro ${montagem.anexoImplantacao} de 3`,
              montagem.recebeSementeira &&
                `Recebe sementeira (${montagem.quantidadeJovensSementeira ?? 12} jovens${montagem.paroquiaAfilhadaNome ? ` de ${montagem.paroquiaAfilhadaNome}` : ''})`,
            ]}
          />
        }
        actions={
          <>
            <LogAtividadeDrawer montagemId={id} />
            {montagem.status === 'EM_ANDAMENTO' && (
              <EditarTamanhoEncontroDialog montagem={montagem} />
            )}
            <FinalizarMontagemButton
              montagemId={id}
              status={montagem.status}
              gruposPorEquipe={gruposPorEquipe}
              alocacoesPorVaga={alocacoesPorVaga}
            />
          </>
        }
      />

      {montagem.status === 'FINALIZADA' && <ResumoEncontroCard montagemId={id} />}

      <ObservacoesConselhoCard montagemId={id} />

      <Tabs defaultValue="equipes">
        <div className="-mx-6 overflow-x-auto px-6">
          <TabsList className="w-max">
            <TabsTrigger value="equipes">Quadro de equipes</TabsTrigger>
            <TabsTrigger value="lista">Lista completa</TabsTrigger>
            <TabsTrigger value="convites">Convites</TabsTrigger>
            <TabsTrigger value="substituicoes">Substituições</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="equipes" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {gruposPorEquipe.map((vagas) => (
              <EquipeCard
                key={vagas[0].equipeId}
                vagas={vagas}
                alocacoes={vagas.flatMap((v) => alocacoesPorVaga.get(v.id) ?? [])}
                onClick={() => setEquipeSelecionadaId(vagas[0].equipeId)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lista">
          <ListaCompletaEquipes
            montagemId={id}
            gruposPorEquipe={gruposPorEquipe}
            alocacoesPorVaga={alocacoesPorVaga}
            todasVagas={montagem.vagas}
            todasAlocacoes={alocacoes ?? []}
            encontroAnterior={montagem.numeroEncontro - 1}
            readOnly={montagem.status === 'FINALIZADA'}
          />
        </TabsContent>

        <TabsContent value="convites">
          <ControleConvitesSection alocacoes={alocacoes ?? []} />
        </TabsContent>

        <TabsContent value="substituicoes">
          <div className="space-y-10">
            <ListaSubstituicaoSection montagemId={id} readOnly={montagem.status === 'FINALIZADA'} />
            {montagem.status !== 'FINALIZADA' && (
              <DesistenciasSection
                montagemId={id}
                alocacoes={alocacoes ?? []}
                todasVagas={montagem.vagas}
              />
            )}
            <ForaDaMontagemSection
              montagemId={id}
              alocacoes={alocacoes ?? []}
              lista={listaSubstituicao ?? []}
              readOnly={montagem.status === 'FINALIZADA'}
            />
          </div>
        </TabsContent>
      </Tabs>

      {equipeSelecionadaId && (
        <EquipeDrawer
          montagemId={id}
          vagas={gruposPorEquipe.find((vagas) => vagas[0].equipeId === equipeSelecionadaId) ?? []}
          alocacoesPorVaga={alocacoesPorVaga}
          circulosFechado={circulosFechado}
          todasVagas={montagem.vagas}
          todasAlocacoes={alocacoes ?? []}
          encontroAnterior={montagem.numeroEncontro - 1}
          readOnly={montagem.status === 'FINALIZADA'}
          open={!!equipeSelecionadaId}
          onOpenChange={(open) => !open && setEquipeSelecionadaId(null)}
        />
      )}
    </div>
  );
}
