/**
 * cache.js — Stale-While-Revalidate على localStorage — Task 2.2
 * مفتاح versioned: price_snapshot_v2 = { prices, usdRates, lastUpdate, v }
 */

const KEY = 'price_snapshot_v2';
const VERSION = 2;

/** حفظ اللقطة كاملة بعد نجاح جلب */
export function saveSnapshot({ prices, usdRates, lastUpdate }) {
  if (!prices || !lastUpdate) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, prices, usdRates, lastUpdate }));
  } catch { /* ممتلئ/خاص */ }
}

/** آخر لقطة صالحة أو null (يتحقق من النسخة) */
export function loadSnapshot() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== VERSION || !s.prices) return null;
    return s;
  } catch { return null; }
}

/** سجّل اللقطة في store فوراً عند الإقلاع (عرض فوري قبل الشبكة) */
export function applySnapshotToStore(store) {
  const s = loadSnapshot();
  if (!s) return false;
  const patch = { prices: s.prices, lastUpdate: s.lastUpdate };
  if (s.usdRates && Object.keys(s.usdRates).length) patch.usdRates = s.usdRates;
  store.set(patch);
  return true;
}
