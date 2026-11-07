// Cabeçalho único das páginas — título com peso de título (24px, negrito), descrição opcional
// e ações que quebram linha no celular em vez de empurrar a página pro lado.
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-balance text-2xl font-bold tracking-tight">{title}</h1>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// Metadados lado a lado (data, padroeiro, nº de jovens) — itens separados por espaço, não por
// "·" em série. Itens vazios (ex.: padroeiro não informado) somem sozinhos.
export function MetaLista({ itens }: { itens: React.ReactNode[] }) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {itens.filter(Boolean).map((item, i) => (
        <span key={i}>{item}</span>
      ))}
    </span>
  );
}
