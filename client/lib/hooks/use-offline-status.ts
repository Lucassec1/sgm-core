'use client';

import { useSyncExternalStore } from 'react';
import { getOfflineStatus, subscribeOfflineStatus } from '../offline-status';

// true quando a última leitura da Montagem (Quadro de Equipes / Distribuição) veio do cache
// do Service Worker, não da rede — ver docs/propostas.md, proposta #6.
export function useOfflineStatus() {
  return useSyncExternalStore(subscribeOfflineStatus, getOfflineStatus, () => false);
}
