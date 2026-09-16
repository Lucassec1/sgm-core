'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Alterna claro → escuro → automático (segue o SO). Um botão só, sem menu: o contexto de
// uso é um notebook da equipe dirigente, não precisa de mais que isso (proposta #7).
const ORDEM = ['light', 'dark', 'system'] as const;
const ROTULO = { light: 'Tema: claro', dark: 'Tema: escuro', system: 'Tema: automático' } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  // next-themes só sabe o tema real depois de montar no cliente — até lá, um placeholder
  // do mesmo tamanho evita mismatch de hidratação e pulo de layout.
  useEffect(() => setMontado(true), []);
  if (!montado) return <Button variant="ghost" size="icon" disabled aria-hidden />;

  const atual = (ORDEM as readonly string[]).includes(theme ?? '')
    ? (theme as (typeof ORDEM)[number])
    : 'system';
  const proximo = ORDEM[(ORDEM.indexOf(atual) + 1) % ORDEM.length];
  const Icon = atual === 'light' ? Sun : atual === 'dark' ? Moon : Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(proximo)}
      title={ROTULO[atual]}
      aria-label={ROTULO[atual]}
    >
      <Icon className="h-[1.1rem] w-[1.1rem]" />
    </Button>
  );
}
