// Mostrado na hora ao navegar entre telas, enquanto o Next busca a próxima rota (pode levar
// alguns segundos no primeiro acesso) — antes o clique parecia não ter feito nada.
export default function Loading() {
  return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
}
