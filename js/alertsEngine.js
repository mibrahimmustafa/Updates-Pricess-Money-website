/**
 * alertsEngine.js — تقييم تلقائي مع كل تحديث سعر — Phase 6
 * تخزين: alerts_v3 (مستقل عن prefs). Toast عند التفعيل + سجل محلي.
 * قابل للتوسع لاحقاً بإشعارات Web Push عبر Service Worker.
 */

import { get, set, subscribe } from './store.js';
import { ASSET_MAP } from './pools.js';
import { usdPerGram, convert } from './money.js';
import { t } from './i18n.js';
import { iso } from './format.js';

const KEY = 'alerts_v3';

/** قراءة/حفظ كل التنبيهات */
export function all() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
export function saveAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ممتلئ */ }
  set({ alertsCount: list.filter(a => a.active).length });
}

export function add({ asset, currency, target, mode }) {
  const list = all();
  list.unshift({
    id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    asset, currency,
    target: Number(target),
    mode, // 'above' | 'below'
    active: true,
    createdAt: Date.now(),
    triggeredAt: null,
  });
  saveAll(list);
  return list;
}

export function toggle(id) {
  const list = all().map(a => a.id === id
    ? { ...a, active: !a.active, triggeredAt: a.active ? null : a.triggeredAt }
    : a);
  saveAll(list);
  return list;
}

export function remove(id) {
  const list = all().filter(a => a.id !== id);
  saveAll(list);
  return list;
}

/** السعر الحالي لجرام المعدن بالعملة — أو null */
export function currentGramPrice(asset, currency) {
  const ug = usdPerGram(asset);
  if (ug == null) return null;
  return convert(ug, 'USD', currency);
}

/** المسافة النسبية للتفعيل — أصغر = أقرب (للفرز) */
function distanceToTrigger(a) {
  const now = currentGramPrice(a.asset, a.currency);
  if (now == null) return Number.POSITIVE_INFINITY;
  return Math.abs(now - a.target) / Math.max(1e-9, Math.abs(a.target));
}

/** تقييم كل التنبيهات النشطة مع آخر أسعار — يقيَّم مع كل تحديث في store */
export function evaluate() {
  let list = all();
  let fired = false;
  list = list.map(a => {
    if (!a.active || a.triggeredAt) return a;
    const now = currentGramPrice(a.asset, a.currency);
    if (now == null) return a;
    const cond = a.mode === 'above' ? now > a.target : now < a.target;
    if (cond) {
      fired = true;
      const asset = ASSET_MAP.get(a.asset);
      const lang = document.documentElement.lang || 'ar';
      const name = asset ? `${asset.icon} ${asset[lang] || asset.code}` : a.asset;
      toast(t('alerts.firedToast', {
        asset: iso(name),
        dir: a.mode === 'above' ? '▲' : '▼',
        price: now.toFixed(2),
        currency: a.currency,
      }), { icon: '🚨', tone: 'alert', ms: 7000 });
      return { ...a, active: false, triggeredAt: Date.now() };
    }
    return a;
  });
  if (fired) saveAll(list);
  return list;
}

/** فرز حسب الأقرب للتفعيل (المواصفة) */
export function sorted() {
  return [...all()]
    .map((a, i) => ({ a, i }))
    .sort((x, y) => distanceToTrigger(x.a) - distanceToTrigger(y.a))
    .map(x => x.a);
}

/** استبعاد spam: إشعار واحد لكل تفعيل — محقق عبر triggeredAt (يرى evaluate) */
subscribe(() => { if (document.hidden) return; evaluate(); });
