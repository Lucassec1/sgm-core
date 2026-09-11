// Aviso "sem conexão — mostrando última versão sincronizada" (docs/propostas.md, proposta
// #6). O Service Worker (public/sw.js) sinaliza respostas servidas do cache via um header
// (X-From-Cache); api-client.ts chama markServedFromCache()/markServedFresh() conforme esse
// header aparece ou não em cada resposta. Pub-sub simples (sem lib nova) porque o estado
// precisa ser lido de fora de React (api-client.ts) e assinado de dentro (useOfflineStatus).
type Listener = (servindoDoCache: boolean) => void;

let servindoDoCache = false;
const listeners = new Set<Listener>();

function set(valor: boolean) {
  if (valor === servindoDoCache) return;
  servindoDoCache = valor;
  listeners.forEach((listener) => listener(servindoDoCache));
}

export function markServedFromCache() {
  set(true);
}

export function markServedFresh() {
  set(false);
}

export function getOfflineStatus() {
  return servindoDoCache;
}

export function subscribeOfflineStatus(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
