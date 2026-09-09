const CACHE = 'studygoal-v99';

self.addEventListener('install', function (e) {
  // 不预缓存目录/资源，避免 addAll 任一失败导致整个 SW 安装失败、连带安装能力报废
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    // 在线先取最新，失败回退缓存（离线可用）
    e.respondWith(
      fetch(e.request).then(function (resp) {
        const cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
        return resp;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }
  // 其余静态资源：缓存优先，回退网络
  e.respondWith(
    caches.match(e.request).then(function (r) { return r || fetch(e.request).catch(function () { return caches.match('./index.html'); }); })
  );
});
