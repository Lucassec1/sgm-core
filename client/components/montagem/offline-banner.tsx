'use client';

import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '@/lib/hooks/use-offline-status';

// "Sem conexão — mostrando a última versão sincronizada" (docs/propostas.md, proposta #6).
// Só aparece quando a última leitura do Quadro de Equipes / Distribuição veio do cache do
// Service Worker — some sozinho assim que qualquer leitura voltar a vir da rede.
export function OfflineBanner() {
  const servindoDoCache = useOfflineStatus();
  if (!servindoDoCache) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      <WifiOff className="h-4 w-4 shrink-0" />
      Sem conexão — mostrando a última versão sincronizada. Alterações não vão salvar até a conexão voltar.
    </div>
  );
}
