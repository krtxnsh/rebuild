/* BUILD and ASSETS are injected by vite.config.ts. */
const prefix = 'rebuild-palampur:' + self.registration.scope + ':';
const version = prefix + BUILD;
const scope = new URL(self.registration.scope);
const assets = new Set(ASSETS);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(version).then(cache => cache.addAll(ASSETS.map(path => new Request(
    new URL(path, scope), { cache: 'reload' }
  )))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== version) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(scope.href)) return;
  const path = url.pathname.slice(scope.pathname.length);
  const asset = path === '' || path.endsWith('/') ? path + 'index.html' : path;
  if (!assets.has(asset)) return;
  event.respondWith((async () => {
    const cache = await caches.open(version);
    return (await cache.match(new URL(asset, scope))) ?? fetch(event.request);
  })());
});
