/**
 * alertsEngine.js — تقييم التنبيهات مع كل تحديث سعر — Phase 6
 * تخزين: alerts_v3. منطق: تفعيل مرة واحدة + إعادة تسليح عند انقلاب الشرط (hysteresis).
 */

import { get, subscribe } from './store.js';
import { CURRENCY_MAP, ASSET_MAP, pricePerGramUSD } from './pools.js';
import { convert } from './money.js';
import { formatMoney, money, iso } from './format.js';
import { t } from './i18n.js';
import { toast, beep } from './ui.js';

const KEY = 'alerts_v3';

/** كل تنبيه: {id, asset, currency, target, direction:'above'|'below', enabled, fired, firedAt, createdAt} */
export function listAlerts() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* تجاهل */ }
}
function mutate(fn) {
  const list = listAlerts();
  const next = fn(list.slice()) || list;
  save(next);
  return next;
}

export function addAlert({ asset, currency, target, direction }) {
  const t = Number(target);
  if (!ASSET_MAP.has(asset) || !CURRENCY_MAP.has(currency)) return null;
  if (!Number.isFinite(t) || t <= 0) return null;
  const item = {
    id: (crypto.randomUUID?.() || 'a' + Date.now() + Math.random().toString(16).slice(2)),
    asset, currency, target: t,
    direction: direction === 'below' ? 'below' : 'above',
    enabled: true, fired: false, firedAt: 0,
    createdAt: Date.now(),
  };
  mutate(list => { list.push(item); return list; });
  evaluate(); // تقييم فوري — لو الشرط محقق أصلاً خدش تلتفتش لتحديث جاي
  return item;
}

export function removeAlert(id) {
  mutate(list => list.filter(a => a.id !== id));
}
export function setEnabled(id, on) {
  mutate(list => list.map(a => a.id === id ? { ...a, enabled: !!on, fired: false } : a));
}
export function clearFired(id) {
  mutate(list => list.map(a => a.id === id ? { ...a, fired: false, firedAt: 0 } : a));
}

/** سعر الجرم الحالي لمعدن × عملة — قاعدة الحساب الوحيدة */
export function gramPrice(asset, currency) {
  const prices = get('prices');
  const p = prices?.[asset]?.usd;
  const gUSD = pricePerGramUSD(asset, p);
  if (!Number.isFinite(gUSD)) return NaN;
  return convert(gUSD, 'USD', currency);
}

/** المسافة النسبية إلى التفعيل — أصغر رقم = الأقرب (للفرز) */
export function distanceToFire(a) {
  const cur = gramPrice(a.asset, a.currency);
  if (!Number.isFinite(cur)) return Infinity;
  return Math.abs(cur - a.target) / a.target;
}

/** التقييم مع كل تحديث — يُستدعى من polling وبعد أي تغيير تنبيهات */
export function evaluate() {
  const alerts = listAlerts();
  if (!alerts.length) return;
  let changed = false;
  for (const a of alerts) {
    if (!a.enabled) continue;
    const cur = gramPrice(a.asset, a.currency);
    if (!Number.isFinite(cur)) continue;
    const met = a.direction === 'above' ? cur >= a.target : cur <= a.target;
    if (met && !a.fired) {
      a.fired = true;
      a.firedAt = Date.now();
      changed = true;
      fireToast(a, cur);
    } else if (!met && a.fired) {
      a.fired = false; // إعادة تسليح بعد الابتعاد عن الحد
      changed = true;
    }
  }
  if (changed) save(alerts); // حفظ نفس الكائنات المعدّلة — لا قراءة جديدة تُضيّع التعديل
}

function fireToast(a, current) {
  const sym = CURRENCY_MAP.get(a.currency)?.symbol || a.currency;
  const dirTxt = a.direction === 'above'
    ? (get('lang') === 'ar' ? 'تجاوز' : 'reached above')
    : (get('lang') === 'ar' ? 'هبط تحت' : 'fell below');
  const assetName = get('lang') === 'ar' ? ASSET_MAP.get(a.asset)?.ar : ASSET_MAP.get(a.asset)?.en;
  const msg = `🔔 ${assetName} ${dirTxt} ${iso(formatMoney(a.target))} ${sym} — ${iso(formatMoney(current))}`;
  toast(msg, { icon: '', kind: 'gold', ms: 7000 });
  beep();
}

/** فرز حسب الأقرب للتفعيل — يُستخدم في صفحة التنبيهات */
export function sortedNearest() {
  return listAlerts().slice().sort((x, y) => {
    const onX = x.enabled ? distanceToFire(x) : Infinity;
    const onY = y.enabled ? distanceToFire(y) : Infinity;
    if (onX !== onY) return onX - onY;
    return (y.createdAt || 0) - (x.createdAt || 0);
  });
}

// اشتراك احتياطي: أي تغيير أسعار من غير polling (نادر) يقيَّم أيضاً
subscribe((changed) => {
  if (changed.includes('prices') || changed.includes('usdRates')) evaluate();
});
