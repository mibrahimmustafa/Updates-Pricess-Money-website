/**
 * money.js — دالة التحويل النقية الوحيدة (قاعدة ذهبية في المواصفة)
 * كل تحويل عملة في المشروع يمر من هنا فقط، مبني على خريطة usdRates.
 */

import { get } from './store.js';

/**
 * convert — من أي عملة إلى أي عملة عبر USD (مصفوفة بسيطة بدون أرقام مركّبة).
 * @param {number} amount
 * @param {string} from كود عملة (أو USD)
 * @param {string} to   كود عملة (أو USD)
 * @param {Record<string, number>} [rates] — حقن خارجي للاختبار؛ الافتراضي من store
 * @returns {number} NaN لو أي سعر مفقود (المستدعي يقرر كيف يعرض)
 */
export function convert(amount, from, to, rates = get('usdRates')) {
  const a = Number(amount);
  if (!rates || !Number.isFinite(a)) return NaN;
  from = String(from || '').toUpperCase();
  to = String(to || '').toUpperCase();
  if (!from || !to) return NaN;
  if (from === to) return a;
  const rf = from === 'USD' ? 1 : rates[from];
  const rt = to === 'USD' ? 1 : rates[to];
  if (!Number.isFinite(rf) || !Number.isFinite(rt) || rf <= 0 || rt <= 0) return NaN;
  return (a / rf) * rt;
}
