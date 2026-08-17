'use client';

import { use, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlocacoes, useMontagem } from '@/lib/hooks/use-montagens';
import { EquipeCard } from '@/components/montagem/equipe-card';
import { EquipeDrawer } from '@/components/montagem/equipe-drawer';
import { ListaCompletaEquipes } from '@/components/montagem/lista-completa-equipes';
import { ListaSubstituicaoSection } from '@/components/montagem/lista-substituicao-section';
import type { Alocacao, VagaMontagem } from '@/lib/types';

function agruparPorEquipe(vagas: VagaMontagem[]) {
  const grupos = new Map<string, VagaMontagem[]>();
  for (const vaga of vagas) {
    const lista = grupos.get(vaga.equipeId) ?? [];
    lista.push(vaga);
    grupos.set(vaga.equipeId, lista);
  }
  return [...grupos.values()].sort((a, b) => a[0].equipe.ordem - b[0].equipe.ordem);
}

export default function MontagemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: montagem, isLoading, isError } = useMontagem(id);
  const { data: alocacoes } = useAlocacoes(id);
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState<string | null>(null);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (isError || !montagem) return <p className="p-6 text-sm text-red-600">Não foi possível carregar a montagem.</p>;

  const gruposPorEquipe = agruparPorEquipe(montagem.vagas);
  const alocacoesPorVaga = new Map<string, Alocacao[]>();
  for (const alocacao of alocacoes ?? []) {
    const lista = alocacoesPorVaga.get(alocacao.vagaMontagemId) ?? [];
    lista.push(alocacao);
    alocacoesPorVaga.set(alocacao.vagaMontagemId, lista);
  }

  const grupoCirculos = gruposPorEquipe.find((vagas) => vagas[0].equipe.ehCirculos);
  const circulosFechado = grupoCirculos
    ? grupoCirculos
        .flatMap((v) => alocacoesPorVaga.get(v.id) ?? [])
        .length > 0 &&
      grupoCirculos.flatMap((v) => alocacoesPorVaga.get(v.id) ?? []).every((a) => a.status === 'ACEITO')
    : false;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{montagem.numeroEncontro}º Encontro</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(montagem.data).toLocaleDateString('pt-BR')}
            {montagem.padroeiro && ` · ${montagem.padroeiro}`}
          </p>
        </div>
        <Badge variant={montagem.status === 'EM_ANDAMENTO' ? 'default' : 'outline'}>
          {montagem.status === 'EM_ANDAMENTO' ? 'Em andamento' : 'Finalizada'}
        </Badge>
      </div>

      <Tabs defaultValue="equipes">
        <TabsList>
          <TabsTrigger value="equipes">Quadro de Equipes</TabsTrigger>
          <TabsTrigger value="lista">Lista completa</TabsTrigger>
          <TabsTrigger value="substituicoes">Substituições</TabsTrigger>
        </TabsList>

        <TabsContent value="equipes" className="space-y-4">
          {!circulosFechado && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Aguardando a Eq. dos Círculos fechar (todos aceitos) — as outras equipes já podem ser rascunhadas, mas o convite delas só é liberado depois.
            </div>
          )}

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
          />
        </TabsContent>

        <TabsContent value="substituicoes">
          <ListaSubstituicaoSection montagemId={id} />
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
          open={!!equipeSelecionadaId}
          onOpenChange={(open) => !open && setEquipeSelecionadaId(null)}
        />
      )}
    </div>
  );
}
