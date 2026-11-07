// Título de subseção dos formulários de ficha (Identificação, Endereço…) — mesmo peso em jovem e
// casal; um degrau abaixo do título de seção da página (h2, text-base).
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold">{children}</h3>;
}
