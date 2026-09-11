// Cache de leitura pro Quadro de Equipes / Distribuição da Montagem (docs/propostas.md,
// proposta #6). Se a internet cair por alguns minutos durante o encontro, a tela continua
// mostrando a última versão sincronizada em vez de travar num erro — não é offline completo
// (não precisa ser: o cenário real é Wi-Fi instável, não sem rede nenhuma).
//
// Só GET dos 3 endpoints que alimentam essas telas são interceptados; tudo o mais (inclusive
// qualquer POST/PATCH/DELETE) passa direto — escrita continua bloqueada sem rede, de propósito.
// Casa pelo caminho, não pela origem, porque a API roda num host separado do client.
const CACHE_NAME = 'sgm-montagem-leitura-v1';

const PADROES_CACHEAVEIS = [/^\/montagens\/[^/]+$/, /^\/montagens\/[^/]+\/alocacoes$/, /^\/equipes$/];

function ehCacheavel(pathname) {
  return PADROES_CACHEAVEIS.some((padrao) => padrao.test(pathname));
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!ehCacheavel(url.pathname)) return;

  event.respondWith(
    fetch(request)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
        }
        return resposta;
      })
      .catch(async () => {
        const emCache = await caches.match(request);
        if (!emCache) throw new Error('Sem rede e sem versão em cache pra essa requisição.');
        // Sinaliza que essa resposta veio do cache — o client usa isso pra mostrar o aviso
        // "sem conexão" (ver lib/offline-status.ts).
        const body = await emCache.blob();
        const headers = new Headers(emCache.headers);
        headers.set('X-From-Cache', 'true');
        return new Response(body, { status: emCache.status, statusText: emCache.statusText, headers });
      }),
  );
});
