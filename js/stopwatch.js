/**
 * stopwatch.js — ساعة الاستجابة الحقيقية — Task 2.3
 * تقيس المدة الفعلية للشبكة (بداية الطلب → آخر استجابة)، بالـ perf clock.
 */

/** يلف دالة async غير متزامن ويقيس زمنها الفعلي بالمللي-ثانية */
export async function measure(fn) {
  const t0 = performance.now();
  const result = await fn();
  const ms = performance.now() - t0;
  return { result, ms };
}

/** فئة chip الاستجابة:  أخضر <700ms، كهرماني <1600ms، أحمر فوقها */
export function latencyClass(ms) {
  if (!Number.isFinite(ms)) return 'deadline-none';
  if (ms < 700) return 'lat-good';
  if (ms < 1600) return 'lat-warn';
  return 'lat-bad';
}

export function latencyLabel(ms, lang = 'ar') {
  if (!Number.isFinite(ms)) return lang === 'ar' ? '—' : '—';
  return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : Math.round(ms) + ' ms';
}
