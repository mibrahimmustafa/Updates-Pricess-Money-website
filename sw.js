/**
 * sw.js — Service Worker — Phase 9.1
 *  - static: cache-first (shell + assets).
 *  - API: network-first مع fallback للكاش (آخر أسعار متاحة offline).
 *  - versioning + تنظيف الكاش القديم عند الترشيح.
 */

const VERSION = 'v3';
const STATIC_CACHE = `pm-static-${VERSION}`;
const API_CACHE = `pm-api-${VERSION}`;
const OFFLINE_URL = './offline.html';

const STATIC_ASSETS = [
  './', './index.html', OFFLINE_URL,
  './manifest.json',
  './css/tokens.css', './css/base.css', './css/layout.css', './css/components.css',
  './assets/logo.svg',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // API: network-first مع cache fallback
  if (url.hostname.includes('gold-api') || url.hostname.includes('frankfurter') ||
      url.hostname.includes('er-api') || url.hostname.includes('stooq')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(e.request);
        const cache = await caches.open(API_CACHE);
        cache.put(e.request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        return new Response(JSON.stringify({ offline: true }), { status: 503, headers: { 'content-type': 'application/json' } });
      }
    })());
    return;
  }

  // ملفات الاستضافة الأخرى (خطوط وصور): cache-first مع تحديث خلفي
  if (url.hostname.includes('gstatic') || url.hostname.includes('googleapis')) return;

  // shell: cache-first مع fallback للـ offline
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    const fetchUpdate = fetch(e.request).then(res => {
      caches.open(STATIC_CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => null);
    return cached || (await fetchUpdate) || (await caches.match(OFFLINE_URL)) || Response.error();
  })());
});
