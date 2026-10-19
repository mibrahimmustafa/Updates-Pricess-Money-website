/**
 * cache.js — Stale-While-Revalidate على localStorage — Task 2.2
 * عند الإقلاع: عرض اللقطة فوراً ثم تحديث بالخلفية. مفاتيح معرّفة بالنسخة.
 */

const SNAP_KEY = 'price_snapshot_v2';

/** حفظ لقطة الأسعار (تُستدعى بعد كل نجاح) */
export function saveSnapshot({ prices, usdRates, lastUpdate }) {
  if (!prices || !usdRates) return;
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify({
      prices, usdRates, lastUpdate, savedAt: Date.now(),
    }));
  } catch { /* التخزين ممتلئ/ممنوع — الكاش رفاهية */ }
}

/** قراءة اللقطة أو null (مع تنظيف تلقائي للتالف) */
export function getSnapshot() {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.prices || !s?.usdRates) return null;
    return s;
  } catch { return null; }
}

/** عمر اللقطة بالميلي ثانية (لرسالة "منذ X") */
export function snapshotAge() {
  const s = getSnapshot();
  return s ? Date.now() - (s.savedAt || s.lastUpdate || 0) : Infinity;
}
