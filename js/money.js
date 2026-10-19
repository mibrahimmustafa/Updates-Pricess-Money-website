/**
 * money.js — القواعد النقدية النقية (النواة الحسابية)
 * قاعدة: كل تحويل عملة/جرام عبر هنا فقط — لا حسابات مبعثرة في الشاشات.
 */

import { get } from './store.js';
import { ASSET_MAP, KARATS } from './pools.js';

/** جرامات الوحدة لكل أصل (أونصة تروي / رطل / عملة رقمية) */
export const UNIT_GRAMS = { oz: 31.1034768, lb: 453.59237, coin: 1 };

/** معدل عملة مقابل الدولار أو null لو غير متوفر */
export function usdRate(code) {
  if (code === 'USD') return 1;
  const v = (get('usdRates') || {})[code];
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** convert — النقية الوحيدة المسموحة: مقدار بين كودين عملات (أو USD) */
export function convert(amount, from, to) {
  const a = Number(amount);
  if (!Number.isFinite(a)) return null;
  if (from === to) return a;
  const rf = usdRate(from), rt = usdRate(to);
  if (rf == null || rt == null) return null;
  return (a / rf) * rt; // عبر الدولار دائماً
}

/** سعر الوحدة (أونصة/رطل/قطعة) بالدولار — null لو لم يصل بعد */
export function usdPerUnit(assetCode) {
  const p = (get('prices') || {})[assetCode];
  return p && Number.isFinite(p.usd) ? p.usd : null;
}

/** دولار لكل جرام للمعدن (للمعدن النفيس فقط) */
export function usdPerGram(assetCode) {
  const asset = ASSET_MAP.get(assetCode);
  const up = usdPerUnit(assetCode);
  if (!asset || up == null) return null;
  return up / (UNIT_GRAMS[asset.unit] || UNIT_GRAMS.oz);
}

/** دولار لكل جرام لعيار ذهب معين — null لو غير متاح */
export function karatUsdPerGram(karat) {
  const ug = usdPerGram('XAU');
  const f = KARATS[karat];
  return (ug == null || f == null) ? null : ug * f;
}

/** كم عشور عقلانية للعرض حسب حجم المبلغ */
export function sensibleDecimals(v) {
  const a = Math.abs(Number(v) || 0);
  if (a >= 1000) return 0;
  if (a >= 100) return 1;
  if (a >= 1) return 2;
  if (a >= 0.1) return 3;
  return 4;
}
