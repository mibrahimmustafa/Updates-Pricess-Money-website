/**
 * polling.js — الدورة الذكية — Task 2.3
 * 30s + إيقاف عند document.hidden + جلب فوري عند العودة + ساعة استجابة حقيقية.
 */

import * as store from './store.js';
import * as api from './api.js';
import * as cache from './cache.js';
import { start as swStart } from './stopwatch.js';
import * as alertsEngine from './alertsEngine.js';
import { record as recordHistory } from './history.js';
import { updatePriceLd } from './seo.js';

const INTERVAL = 30000;
let timer = null;
let busy = false;
let unsubPrefs = null;
let debounceT = null;

/** بدء الدورة — يُستدعى مرة واحدة من main.js */
export function start() {
  // 1) عرض اللقطة فوراً (Stale) — إن وُجدت
  const snap = cache.getSnapshot();
  if (snap) {
    store.set({
      prices: snap.prices || {},
      usdRates: snap.usdRates || {},
      lastUpdate: snap.savedAt || snap.lastUpdate || Date.now(),
      stale: true,
    });
  }
  // 2) جلب حي أول
  refresh();
  // 3) دورة كل 30 ثانية (تتوقف أثناء إخفاء التبويب)
  timer = setInterval(() => { if (!document.hidden) refresh(); }, INTERVAL);
  // 4) عودة للتبويب → جلب فوري
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !store.get('staleFetchOnly')) refresh();
  });
  // 5) تغيير قوائم العرض → إعادة جلب (مع debounce ضد العصف عند تحرير chips متتالية)
  unsubPrefs = store.subscribe((changed) => {
    if (changed.some(k => k === 'currencies' || k === 'metals')) {
      clearTimeout(debounceT);
      debounceT = setTimeout(refresh, 600);
    }
  });
}

/** جلب أسعار حي + قياس الاستجابة + حفظ + تقييم تنبيهات + SEO */
export async function refresh() {
  if (busy) return;
  busy = true;
  const sw = swStart();
  const currencies = store.get('currencies') || [];
  const metals = store.get('metals') || [];
  let hadSuccess = false;

  const [ratesRes, assetsRes] = await Promise.allSettled([
    api.getRates(currencies),
    api.getAssetPrices(metals),
  ]);

  const usdRates = { ...(store.get('usdRates') || {}) };
  if (ratesRes.status === 'fulfilled') { Object.assign(usdRates, ratesRes.value); hadSuccess = true; }
  usdRates.USD = 1;

  const prices = { ...(store.get('prices') || {}) };
  if (assetsRes.status === 'fulfilled') {
    Object.assign(prices, assetsRes.value.prices);
    if (assetsRes.value.failed.length === 0) hadSuccess = true;
    else if (Object.keys(assetsRes.value.prices).length) hadSuccess = true;
  }

  store.set({
    usdRates, prices,
    online: hadSuccess || navigator.onLine,
    stale: hadSuccess ? false : !!store.get('stale'),
    latencyMs: sw.ms(),
    ...(hadSuccess ? { lastUpdate: Date.now() } : {}),
  });

  if (hadSuccess) {
    cache.saveSnapshot({ prices: store.get('prices'), usdRates: store.get('usdRates'), lastUpdate: store.get('lastUpdate') });
    recordHistory(store.get('prices'), store.get('usdRates'));
    try { alertsEngine.evaluate(); } catch { /* لا يسقط الدورة */ }
    try { updatePriceLd(); } catch { /* SEO رفاهية */ }
  }
  busy = false;
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  unsubPrefs?.();
}
