'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AvisoRegra } from '@/lib/types';

// Cores das badges de aviso (docs/design-system.md): vermelho = foge da regra, âmbar = vale
// conferir, verde = ponto positivo (ex.: avaliado "pode coordenar").
const COR = {
  grave: 'border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 font-medium',
  atencao:
    'border-transparent bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium',
  positivo:
    'border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 font-medium',
} as const;

export function BadgeAviso({
  nivel,
  children,
  titulo,
}: {
  nivel: keyof typeof COR;
  children: React.ReactNode;
  titulo?: string;
}) {
  const badge = (
    <Badge variant="outline" className={`whitespace-nowrap text-[11px] ${COR[nivel]}`}>
      {children}
    </Badge>
  );
  if (!titulo) return badge;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{badge}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{titulo}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// R1–R3 não bloqueiam (decisão de 14/10/2026, docs/regras-imutaveis.md) — ficam visíveis como
// badge na pessoa alocada, com a explicação completa no tooltip.
export function AvisoBadges({ avisos }: { avisos?: AvisoRegra[] }) {
  if (!avisos?.length) return null;
  return (
    <>
      {avisos.map((aviso) => (
        <BadgeAviso key={aviso.regra} nivel={aviso.nivel} titulo={aviso.mensagem}>
          {aviso.rotulo}
        </BadgeAviso>
      ))}
    </>
  );
}

/** Rótulo e nível da badge de R2 na busca: `vezes` = quantas vezes já serviu na equipe. */
export function avisoDeRepeticao(
  vezes: number,
): { nivel: 'grave' | 'atencao'; rotulo: string } | null {
  if (vezes <= 0) return null;
  return { nivel: vezes >= 3 ? 'grave' : 'atencao', rotulo: `${vezes + 1}ª vez nesta equipe` };
}
