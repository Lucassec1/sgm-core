'use client';

import { useEffect } from 'react';

// Registra o Service Worker de cache de leitura da Montagem (public/sw.js — docs/propostas.md,
// proposta #6). Registro é leve e idempotente; o filtro de quais requisições cachear vive
// inteiramente dentro do sw.js, não aqui — esse componente só garante que ele está ativo.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Falha silenciosa — é um reforço de resiliência, não uma dependência do app funcionar
      // (ex.: navegador sem suporte, ou o registro falhou por algum motivo transitório).
    });
  }, []);

  return null;
}
