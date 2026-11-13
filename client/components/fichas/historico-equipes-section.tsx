import { Badge } from '@/components/ui/badge';
import { AlocacaoStatusBadge } from '@/components/montagem/alocacao-status-badge';
import { EquipeIcon } from '@/components/equipes/equipe-icon';
import { useHistoricoEquipes } from '@/lib/hooks/use-fichas';
import { useHistoricoEquipesCasal } from '@/lib/hooks/use-fichas-casais';
import type { HistoricoEquipeItem } from '@/lib/types';
import { MetaLista } from '@/components/page-header';

// Histórico de equipes servidas + avaliação (docs/requisitos.md, 2.1) — um registro por
// Alocacao (por equipe/encontro que a pessoa serviu). Avaliação aqui é só pode
// coordenar/palestrar, específicos daquela equipe, não um selo geral. Dado gerado pelo
// módulo Montagem, não editável aqui.
export function HistoricoEquipesLista({
  historico,
  isLoading,
}: {
  historico?: HistoricoEquipeItem[];
  isLoading: boolean;
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!historico || historico.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não serviu em nenhuma equipe.</p>;
  }

  return (
    <ul className="space-y-3">
      {historico.map((item) => (
        <li key={item.id} className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <EquipeIcon
                slug={item.vagaMontagem.equipe.slug}
                nome={item.vagaMontagem.equipe.nome}
              />
              <div>
                <p className="text-sm font-medium">{item.vagaMontagem.equipe.nome}</p>
                <MetaLista
                  className="text-xs text-muted-foreground"
                  itens={[
                    item.vagaMontagem.cargo.nome,
                    `${item.vagaMontagem.montagem.numeroEncontro}º Encontro (${new Date(item.vagaMontagem.montagem.data).toLocaleDateString('pt-BR')})`,
                    // Implantação: serviço num encontro de outra paróquia.
                    item.outraParoquia && item.vagaMontagem.montagem.paroquia?.nome,
                  ]}
                />
              </div>
            </div>
            <AlocacaoStatusBadge status={item.status} />
          </div>

          {(item.podeCoordenar || item.podePalestrar) && (
            <div className="flex gap-2">
              {item.podeCoordenar && (
                <Badge variant="sucesso" className="font-medium">
                  Pode coordenar essa equipe
                </Badge>
              )}
              {item.podePalestrar && (
                <Badge variant="sucesso" className="font-medium">
                  Pode palestrar
                </Badge>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function HistoricoEquipesSection({ fichaId }: { fichaId: string }) {
  const { data: historico, isLoading } = useHistoricoEquipes(fichaId);
  return <HistoricoEquipesLista historico={historico} isLoading={isLoading} />;
}

export function HistoricoEquipesCasalSection({ fichaCasalId }: { fichaCasalId: string }) {
  const { data: historico, isLoading } = useHistoricoEquipesCasal(fichaCasalId);
  return <HistoricoEquipesLista historico={historico} isLoading={isLoading} />;
}
