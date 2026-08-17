import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlocacaoStatusBadge } from '@/components/montagem/alocacao-status-badge';
import { useHistoricoEquipes } from '@/lib/hooks/use-fichas';

// Histórico de equipes servidas (docs/requisitos.md, 2.1) — dado gerado pelo módulo
// Montagem (Alocacao), não editável aqui.
export function HistoricoEquipesSection({ fichaId }: { fichaId: string }) {
  const { data: historico, isLoading } = useHistoricoEquipes(fichaId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!historico || historico.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não serviu em nenhuma equipe.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Encontro</TableHead>
          <TableHead>Equipe</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {historico.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              {item.vagaMontagem.montagem.numeroEncontro}º ({new Date(item.vagaMontagem.montagem.data).toLocaleDateString('pt-BR')})
            </TableCell>
            <TableCell>{item.vagaMontagem.equipe.nome}</TableCell>
            <TableCell>{item.vagaMontagem.cargo.nome}</TableCell>
            <TableCell>
              <AlocacaoStatusBadge status={item.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
