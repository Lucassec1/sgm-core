import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        // Variantes de significado (docs/design-system.md): tom suave, nunca preenchimento sólido —
        // o sólido é reservado à cor do círculo. Sempre com ícone ou texto, nunca só a cor.
        sucesso:
          'border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
        atencao:
          'border-transparent bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        perigo: 'border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
        neutro: 'border-transparent bg-muted text-muted-foreground',
        ouro: 'border-transparent bg-ouro-suave text-ouro-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
