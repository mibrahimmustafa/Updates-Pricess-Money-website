/**
 * format.js — أدوات التنسيق الموحدة (Task 0.3)
 * قاعدة: كل الأرقام en-US. أي دمج رقم داخل نص RTL يمر عبر العزل LRI…PDI.
 */

/** Directional Isolates */
export const LRI = '\u2066'; // Left-to-Right Isolate
export const PDI = '\u2069'; // Pop Directional Isolate

/** يلف نصاً لاتينياً (رقم/كود) بعزلة اتجاه لاستخدامه داخل سياق RTL */
export function iso(text) {
  return LRI + String(text) + PDI;
}

/**
 * تنسيق مبلغ مالي en-US بخطوط أرقام إنجليزية.
 * @param {number} n
 * @param {{decimals?: number}} [opts]
 * @returns {string} مثال: 7,141.72
 */
export function formatMoney(n, opts = {}) {
  const dec = opts.decimals ?? 2;
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
    useGrouping: true,
  }).format(num);
}

/** مبلغ معزول جاهز للحقن في نص RTL: LRI 7,141.72 PDI */
export function money(n, opts = {}) {
  return iso(formatMoney(n, opts));
}

/** رقم خام معزول (بدون فواصل) — لأكواد/زمن */
export function isoNum(x) {
  return iso(String(x));
}

/** زمن استجابة: 401 ms — معزول للتضمين في RTL */
export function formatLatency(ms) {
  if (!Number.isFinite(ms) || ms < 0) return iso('—') + ' ms';
  const v = ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : Math.round(ms) + ' ms';
  return iso(v);
}

/** "آخر تحدّث: منذ X" — يرجع {text, key} حسب اللغة */
export function timeAgo(dateMs, lang = 'ar') {
  const diff = Math.max(0, Date.now() - dateMs);
  const s = Math.floor(diff / 1000);
  let text;
  if (lang === 'ar') {
    if (s < 5) text = 'الآن';
    else if (s < 60) text = `منذ ${s} ثانية`;
    else if (s < 3600) text = `منذ ${Math.floor(s / 60)} دقيقة`;
    else text = `منذ ${Math.floor(s / 3600)} ساعة`;
  } else {
    if (s < 5) text = 'just now';
    else if (s < 60) text = `${s}s ago`;
    else if (s < 3600) text = `${Math.floor(s / 60)}m ago`;
    else text = `${Math.floor(s / 3600)}h ago`;
  }
  // الرقم داخل نص RTL يلزمه عزل
  return text.replace(/(\d+[a-z]*)/g, m => iso(m));
}

/** تاريخ UTC بصيغة yyyy-mm-dd (للمخططات/السجل التاريخي لاحقاً) */
export function utcDate(y, m, d) {
  return `${y}` + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
