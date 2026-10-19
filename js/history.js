/**
 * history.js — سجل محلي لمخططات المعادن (Task 7.1)
 * gold-api لا يقدم تاريخاً — نتجمّع محلياً: كل دقّة ≤ كل 5 دقائق، سقف 1440 نقطة.
 * نخزن مع كل نقطة: أسعار الجرم بالدولار + خريطة الصرف وقتها → تحويل تاريخي دقيق.
 */

import { ASSET_MAP, pricePerGramUSD } from './pools.js';

const KEY = 'history_v1';
const MIN_GAP = 5 * 60 * 1000;
const MAX_POINTS = 1440; // ≈ 5 أيام من الاستخدام الفعلي (قابلة للتمدد لاحقاً)

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return (s && typeof s === 'object') ? s : {};
  } catch { return {}; }
}
function save(h) {
  try { localStorage.setItem(KEY, JSON.stringify(h)); } catch { /* رفاهية */ }
}

/** تسجيل نقطة جديدة مع كل تحديث أسعار ناجح */
export function record(prices, usdRates) {
  if (!prices || !usdRates) return;
  const h = load();
  const lastT = h._lastT || 0;
  if (Date.now() - lastT < MIN_GAP) return;
  h._lastT = Date.now();
  const point = { t: Date.now(), p: {}, r: usdRates };
  for (const code of Object.keys(prices)) {
    if (!ASSET_MAP.has(code)) continue;
    const g = pricePerGramUSD(code, prices[code].usd);
    if (Number.isFinite(g)) point.p[code] = Number(g.toFixed(6));
  }
  // كل كود: مصفوفة نقاط + سجل مشترك لخريطة الصرف (لسجل العملات المحلي)
  h._rates = h._rates || [];
  h._rates.push({ t: point.t, r: usdRates });
  if (h._rates.length > MAX_POINTS) h._rates = h._rates.slice(-MAX_POINTS);
  for (const code of Object.keys(point.p)) {
    h[code] = h[code] || [];
    h[code].push(point);
    if (h[code].length > MAX_POINTS) h[code] = h[code].slice(-MAX_POINTS);
  }
  delete h._lastT;
  save(h);
}

/** نقاط كود معدن: [{t, gramUsd, rates}] */
export function series(assetCode) {
  const h = load();
  return Array.isArray(h[assetCode]) ? h[assetCode] : [];
}

/** خريطة الصرف عبر الزمن (لرسم عملة مقابل عملة محلياً) */
export function ratesSeries() {
  const h = load();
  return Array.isArray(h._rates) ? h._rates : [];
}

/** هل يوجد سجل كافٍ للرسم؟ */
export function hasEnough(assetCode, min = 3) {
  return series(assetCode).length >= min;
}

/** سجل محلي مُدمج: قيمة 1 أصل (معدن بالجرم أو عملة) بعملة العرض عبر الزمن */
export function localCombined(assetCode, curCode) {
  if (ASSET_MAP.has(assetCode)) {
    return series(assetCode)
      .filter(b => Number.isFinite(b.p?.[assetCode]) && Number.isFinite(b.r?.[curCode]))
      .map(b => ({ t: b.t, v: b.p[assetCode] * b.r[curCode] }));
  }
  return ratesSeries()
    .filter(b => Number.isFinite(b.r?.[assetCode]) && Number.isFinite(b.r?.[curCode]))
    .map(b => ({ t: b.t, v: (1 / b.r[assetCode]) * b.r[curCode] }));
}
