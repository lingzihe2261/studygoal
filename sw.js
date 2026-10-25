/* 工作台 Service Worker · v280 (2026-10-21)
   职责：① 清掉历史遗留缓存；② 导航请求"网络优先"——联网时永远先向服务器拿最新页，
   绝不留陈旧壳；仅在断网时回退到缓存（离线兜底）。
   注意：数据存在 localStorage，SW 只管页面外壳新旧，不碰业务数据。 */
const CACHE = 'studygoal-shell-v353';

self.addEventListener('install', function (e) {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const ks = await caches.keys();
    await Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(handleNavigate(req)); }
});

async function handleNavigate(req) {
  const cache = await caches.open(CACHE);
  const bust = function (p) { return p + (p.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now(); };
  const target = req ? req.url : self.location.href;
  const clean = target.split('?')[0];
  // 网络优先：联网时永远拿服务器最新页；失败才用缓存（离线兜底）
  try {
    const fresh = await fetch(bust(target), { cache: 'no-store' });
    if (fresh && fresh.ok) {
      cache.put(new Request(clean), fresh.clone());
      return fresh;
    }
  } catch (err) { /* 网络失败，走缓存兜底 */ }
  const last = await cache.match(new Request(clean));
  if (last) return last;
  // kb-lib.html 等子页未缓存时，优雅降级回工作台首页
  const idx = await cache.match(new Request(self.location.origin + '/index.html'));
  if (idx) return idx;
  const keys = await cache.keys();
  for (const k of keys) { const r = await cache.match(k); if (r) return r; }
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>离线</title>' +
    '<body style="font-family:system-ui,-apple-system,sans-serif;padding:48px 24px;text-align:center;color:#4a3b32">' +
    '<h2>当前网络不可用</h2><p>你的数据都保存在本机，联网后重新打开即可。</p></body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
