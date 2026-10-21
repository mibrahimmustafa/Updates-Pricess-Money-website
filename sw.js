/**
 * sw.js — Service Worker لعملية أوفلاين كاملة — Phase 9
 * استراتيجيات:
 *  - ملفات ثابتة (css/js/صور): cache-first.
 *  - صفحات/تنقل: network-first مع cache index.html fallback (يعمل بالكامل أوفلاين).
 *  - API (gold-api | frankfurter): network-first + تخزين آخر نجاح (stale fallback).
 *  - خطوط Google: cache بعد أول نجاح (runtime).
 * versioning مع تنظيف الكاش القديم.
 */

const VERSION = 'pm-v1.4.7';
const CORE = `${VERSION}-core`;
const RUNTIME = `${VERSION}-runtime`;
const API = `${VERSION}-api`;

const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo.svg',
  './assets/icons/icon-32.png',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './css/tokens.css', './css/base.css', './css/layout.css', './css/components.css', './css/features.css',
  './js/main.js', './js/router.js', './js/store.js', './js/i18n.js', './js/format.js',
  './js/pools.js', './js/api.js', './js/polling.js', './js/cache.js', './js/stopwatch.js',
  './js/money.js', './js/ui.js', './js/seo.js', './js/history.js', './js/alertsEngine.js',
  './js/pages/registry.js', './js/pages/home.js', './js/pages/converter.js', './js/pages/jewelry.js',
  './js/pages/alerts.js', './js/pages/chart.js', './js/pages/timemachine.js', './js/pages/cbe.js',
  './js/pages/settings.js', './js/pages/more.js',
  './js/pages/legal.js', './js/pages/privacy.js', './js/pages/terms.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE);
    await Promise.allSettled(CORE_FILES.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isLocalDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

  // 1) روابطنا الداخلية: cache-first في الإنتاج — network-first في التطوير المحلي
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith(networkFirst(req, CORE, './index.html'));
    } else if (isLocalDev) {
      event.respondWith(networkFirst(req, CORE));
    } else {
      event.respondWith(cacheFirst(req, CORE));
    }
    return;
  }

  // 2) APIs: network-first مع fallback لآخر استجابة مخزنة
  if (/(^|\.)gold-api\.com$/.test(url.hostname) || /(^|\.)frankfurter\.dev$/.test(url.hostname)) {
    event.respondWith(networkFirst(req, API));
    return;
  }

  // 3) خطوط Google وأصول cross-origin: runtime cache بعد أول نجاح
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(runtimeCacheFirst(req, RUNTIME));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req, { cacheName });
  if (cached) return cached;
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('', { status: 504, statusText: 'offline' });
  }
}

async function runtimeCacheFirst(req, cacheName) {
  const cached = await caches.match(req, { cacheName });
  if (cached) return cached;
  const cache = await caches.open(cacheName);
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, cacheName, fallbackURL) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req, { cacheName });
    if (cached) return cached;
    if (fallbackURL) {
      const fb = await caches.match(fallbackURL, { cacheName });
      if (fb) return fb;
    }
    return new Response('', { status: 504, statusText: 'offline' });
  }
}
