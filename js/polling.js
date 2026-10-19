/**
 * polling.js — دورة 30 ثانية ذكية — Task 2.3
 *  - تتوقف عند document.hidden وتستأنف بجلب فوري عند العودة.
 *  - كل نجاح يحدّث store ويكتب snapshot في cache (SWR).
 */

import * as api from './api.js';
import { get, set } from './store.js';
import { saveSnapshot } from './cache.js';
import { measure } from './stopwatch.js';

const INTERVAL = 30_000; // احترام كاش gold-api ~30s

let timer = null;
let inflight = false;
let running = false;
const visibilityHandlers = [];

/** جلب دوري واحد: أصول + عملات بالتوازي، القياس الحقيقي بالساعة */
export async function fetchOnce() {
  if (inflight) return;
  inflight = true;
  try {
    const codes = get('currencies') || [];
    const metals = get('metals') || [];
    const { result, ms } = await measure(() => Promise.allSettled([
      api.fetchAllAssets(metals),
      api.fetchUsdRates(codes),
      api.fetchCBERates(),
    ]));
    const [assets, rates, cbe] = result;

    const patch = { latencyMs: Math.round(ms) };
    if (rates.status === 'fulfilled') patch.usdRates = rates.value;
    if (assets.status === 'fulfilled') {
      patch.prices = assets.value;
      patch.lastUpdate = Date.now();
      patch.online = true;
      saveSnapshot({
        prices: assets.value,
        usdRates: rates.status === 'fulfilled' ? rates.value : get('usdRates'),
        lastUpdate: patch.lastUpdate,
      });
    } else {
      patch.online = false; // بانر الشبكة يظهر تلقائياً من الشاشات
    }
    if (cbe.status === 'fulfilled' && cbe.value) patch.cbeRates = cbe.value;
    set(patch);
  } catch {
    set({ online: false });
  } finally {
    inflight = false;
  }
}

function schedule() {
  stopTimer();
  timer = setInterval(fetchOnce, INTERVAL);
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null; }
}

export function start() {
  if (running) return;
  running = true;
  fetchOnce(); // جلب فوري أول
  schedule();

  const onVisible = () => {
    if (!document.hidden) fetchOnce(); // عودة للتبويب = جلب فوري
  };
  document.addEventListener('visibilitychange', onVisible);
  visibilityHandlers.push([document, 'visibilitychange', onVisible]);
}

export function stop() {
  stopTimer();
  running = false;
  visibilityHandlers.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
  visibilityHandlers.length = 0;
}

/** إعادة محاولة يدوية (زر البانر) */
export async function force() {
  return fetchOnce();
}
