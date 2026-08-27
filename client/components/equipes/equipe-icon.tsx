import Image from 'next/image';
import { cn } from '@/lib/utils';

// Ícones das 16 equipes do Segue-me (PNG em public/equipes/, nome do arquivo = slug da
// Equipe). Uso pequeno (16–24px) e SEMPRE ao lado do nome da equipe — nunca sozinho, mesma
// regra dos badges de cor do círculo (ver docs/design-system.md, seção 1 e 3).
const SLUGS = new Set([
  'comando-geral',
  'circulos',
  'espiritualizadora',
  'animacao',
  'canto',
  'cozinha',
  'estacionamento',
  'faxina',
  'grafica',
  'lanche',
  'liturgia-e-vigilia',
  'minimercado',
  'prover',
  'sala',
  'vigilia-paroquial',
  'visitacao',
]);

export function EquipeIcon({
  slug,
  nome,
  size = 20,
  className,
}: {
  slug: string;
  /** Nome da equipe — usado só no alt. Se ausente, o ícone é tratado como decorativo. */
  nome?: string;
  size?: number;
  className?: string;
}) {
  if (!SLUGS.has(slug)) return null;

  return (
    <Image
      src={`/equipes/${slug}.png`}
      alt={nome ? `Ícone da equipe ${nome}` : ''}
      aria-hidden={nome ? undefined : true}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
