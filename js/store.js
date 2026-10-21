/**
 * store.js — الحالة المركزية بنمط Pub/Sub (بديل Zustand) — Task 0.4
 * قواعد:
 *  - لا صفحة تلمس localStorage مباشرة: كل شيء عبر store.
 *  - الأسعار والاستجابة تمر هنا؛ كل مشترك يتلقى إشعاراً عند أي تغيير.
 *  - التخزين بمفتاح معرّف بالنسخة prefs_v2 مع fallback آمن.
 */

import { DEFAULT_CURRENCIES, DEFAULT_ASSETS, ASSET_MAP, CURRENCY_MAP } from './pools.js';

const PREFS_KEY = 'prefs_v2';

const DEFAULT_STATE = Object.freeze({
  // تفضيلات (تُحفظ)
  lang: 'ar',              // 'ar' | 'en'
  theme: 'dark',           // 'dark' | 'light' | 'system'
  displayCurrency: 'EGP',  // يجب أن تكون ضمن العملات الظاهرة
  currencies: [],          // أكواد العملات الظاهرة (18 افتراضياً)
  metals: [],              // أكواد الأصول الظاهرة (من pools)
  // لحظية (لا تُحفظ)
  prices: {},              // { XAU: { usd: number, gramUsd: number }, ... }
  usdRates: {},            // { EGP: 47.6, ... } — خريطة التحويل الوحيدة
  lastUpdate: 0,           // timestamp آخر تحديث أسعار
  online: true,
  latencyMs: null,         // قياس حقيقي من الجهاز الحالي
});

let state = { ...DEFAULT_STATE, currencies: [...DEFAULT_CURRENCIES], metals: [...DEFAULT_ASSETS] };
const listeners = new Set(); // (changedKeys, state) => void

/** قراءة قيمة (تدعم مساراً بنقاط "a.b" اختيارياً) */
export function get(key) {
  if (!key) return state;
  if (key in state) return state[key];
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
}

/** كتابة جزئية + نشر الحدث + حفظ التفضيلات.
 * تحصين: currencies/metals لا يصجان غير مصفوفتين من أي كاتب —
 * القيمة غير المصفوفة (null وغيرها) تعود للافتراضي بدل أن تنكسر الصفحات لاحقاً */
export function set(partial) {
  if (partial.currencies !== undefined && !Array.isArray(partial.currencies)) {
    partial = { ...partial, currencies: [...DEFAULT_CURRENCIES] };
  }
  if (partial.metals !== undefined && !Array.isArray(partial.metals)) {
    partial = { ...partial, metals: [...DEFAULT_ASSETS] };
  }
  const changed = Object.keys(partial).filter(k =>
    JSON.stringify(partial[k]) !== JSON.stringify(state[k])
  );
  if (changed.length === 0) return state;
  state = { ...state, ...partial };
  listeners.forEach(fn => {
    try { fn(changed, state); } catch { /* مشترك مكسور لا يسقط البقية */ }
  });
  persistPrefs();
  return state;
}

/** اشتراك في أي تغيير — يعيد دالة إلغاء الاشتراك */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** حفظ التفضيلات فقط (لا أسعار ولا قيم لحظية) */
function persistPrefs() {
  const prefs = {
    lang: state.lang,
    theme: state.theme,
    displayCurrency: state.displayCurrency,
    currencies: state.currencies,
    metals: state.metals,
  };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ممتلئ/ممنوع — تجاهل */ }
}

/** تحميل آمن: prefs تالف أو ناقص يعود للافتراضيات */
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return;
    if (p.lang === 'ar' || p.lang === 'en') state.lang = p.lang;
    if (['dark', 'light', 'system'].includes(p.theme)) state.theme = p.theme;

    const list = Array.isArray(p.currencies)
      ? [...new Set(p.currencies.filter(c => CURRENCY_MAP.has(c)))]
      : [];
    state.currencies = list.length ? list : [...DEFAULT_CURRENCIES];

    // العملة الافتراضية دائماً ضمن الظاهرة
    if (CURRENCY_MAP.has(p.displayCurrency) && state.currencies.includes(p.displayCurrency)) {
      state.displayCurrency = p.displayCurrency;
    } else {
      state.displayCurrency = state.currencies.includes('EGP') ? 'EGP' : state.currencies[0];
    }

    const mets = Array.isArray(p.metals)
      ? [...new Set(p.metals.filter(m => ASSET_MAP.has(m)))]
      : [];
    state.metals = mets.length ? mets : [...DEFAULT_ASSETS];
  } catch { /* تالف — عُد بالافتراضي بصمت */ }
}

/* ---------- الثيم: dark / light / system ---------- */
const mql = window.matchMedia('(prefers-color-scheme: light)');

/** يطبق الثيم المُحل على <html data-theme> + meta theme-color */
function applyTheme() {
  const t = get('theme');
  const resolved = t === 'system' ? (mql.matches ? 'light' : 'dark') : (t || 'dark');
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#F7F3EA' : '#12100C');
}

/** التبديل السريع للثيم: dark → light → system → dark */
export function cycleTheme() {
  const t = get('theme');
  const next = t === 'dark' ? 'light' : t === 'light' ? 'system' : 'dark';
  set({ theme: next });
}

/** إقلاع المخزن — يُستدعى مرة واحدة من main.js قبل رسم أي شيء */
export function init() {
  loadPrefs();
  applyTheme();
  mql.addEventListener('change', () => { if (get('theme') === 'system') applyTheme(); });
  // أي تغيير للثيم من الإعدادات/التبديل السريع يعيد التطبيق فوراً
  subscribe((changed) => { if (changed.includes('theme')) applyTheme(); });

  const online = navigator.onLine;
  window.addEventListener('online', () => set({ online: true }));
  window.addEventListener('offline', () => set({ online: false }));
  set({ online }); // نشر أولي للمشتركين
  return state;
}
