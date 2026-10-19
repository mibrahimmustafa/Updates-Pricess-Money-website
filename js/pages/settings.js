/**
 * pages/settings.js — الإعدادات — Phase 4
 * لغة + مظهر (3 أوضاع) + عملة افتراضية + اختيار العملات (بحث/chips/بريسات/عداد/حماية)
 * + اختيار الأصول — كل تغيير ينعكس فوراً في كل الشاشات عبر store.
 */

import { get, set, subscribe } from '../store.js';
import { CURRENCIES, ASSETS, ASSET_MAP, CURRENCY_MAP, flagEmoji } from '../pools.js';
import { t, setLang } from '../i18n.js';
import { el, toast } from '../ui.js';

let root = null;
let curFilter = 'all';
let searchQ = '';
let reBuildRef = null;
export function renderSettings(container) {
  root = el('section', { class: 'page settings' });

  root.append(
    // عنوان الصفحة — كانت الشاشة الوحيدة بلا h1 (تسلسل عناوين سليم للوصولية)
    el('h1', { class: 'page-title', text: t('settings.title'), 'data-i18n': 'settings.title' }),
    sectionLang(),
    sectionTheme(),
    sectionDisplayCurrency(),
    sectionCurrencies(),
    sectionAssets(),
    sectionReset(),
  );
  container.append(root);
  const reBuild = () => {
    root.replaceChildren();
    root.append(
      el('h1', { class: 'page-title', text: t('settings.title'), 'data-i18n': 'settings.title' }),
      sectionLang(),
      sectionTheme(),
      sectionDisplayCurrency(),
      sectionCurrencies(),
      sectionAssets(),
      sectionReset(),
    );
  };

  const unsub = subscribe((changed) => {
    if (changed.includes('lang')) reBuild(); // إعادة بناء كل الأقسام بنصوص جديدة
  });
  reBuildRef = reBuild;
  return () => { unsub(); root = null; reBuildRef = null; };
}

/* ---------- بناء قسم عام ---------- */
function section(titleKey, body) {
  const s = el('section', { class: 'card settings-section' });
  s.append(el('h2', { class: 'sec-title', text: t(titleKey) }), body);
  return s;
}

/* ---------- 1) اللغة ---------- */
function sectionLang() {
  const wrap = el('div', { class: 'segmented', role: 'group', 'aria-label': t('settings.lang') });
  for (const [code, label] of [['ar', 'العربية'], ['en', 'English']]) {
    const b = el('button', {
      type: 'button', class: 'seg-btn rippleable', text: label,
      onclick: () => setLang(code),
    });
    b.dataset.lang = code;
    wrap.append(b);
  }
  syncLang(wrap);
  subscribe(() => syncLang(wrap));
  return section('settings.lang', wrap);
}
function syncLang(wrap) {
  wrap.querySelectorAll('.seg-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === get('lang')));
}

/* ---------- 2) المظهر ---------- */
function sectionTheme() {
  const wrap = el('div', { class: 'segmented', role: 'group', 'aria-label': t('settings.theme') });
  const opts = [['system', 'theme.system', '🖥'], ['light', 'theme.light', '☀️'], ['dark', 'theme.dark', '🌙']];
  for (const [code, key, icon] of opts) {
    const b = el('button', {
      type: 'button', class: 'seg-btn rippleable',
      onclick: () => set({ theme: code }),
    }, el('span', { text: icon, 'aria-hidden': 'true' }), el('span', { text: t(key) }));
    b.dataset.theme = code;
    wrap.append(b);
  }
  syncTheme(wrap);
  subscribe((changed) => { if (changed.includes('theme')) syncTheme(wrap); });
  return section('settings.theme', wrap);
}
function syncTheme(wrap) {
  wrap.querySelectorAll('.seg-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === get('theme')));
}

/* ---------- 3) العملة الافتراضية ---------- */
function sectionDisplayCurrency() {
  const id = 'displayCurSel';
  const sel = el('select', { class: 'select rippleable', id, 'aria-label': t('settings.displayCurrency') });
  fillDisplayCurrencyOptions(sel);
  sel.addEventListener('change', () => set({ displayCurrency: sel.value }));

  const wrap = el('div', {},
    sel,
    el('p', { class: 'hint', text: t('settings.displayHint') }),
  );
  syncDisplayCurrencyOptions.defaultSel = sel;
  const s = section('settings.displayCurrency', wrap);
  return s;
}
function fillDisplayCurrencyOptions(sel) {
  sel.replaceChildren();
  for (const code of get('currencies')) {
    const c = CURRENCY_MAP.get(code);
    const o = el('option', { value: code, text: `${flagEmoji(code)} ${code} — ${c.ar} (${c.symbol})` });
    sel.append(o);
  }
  sel.value = get('displayCurrency');
}
function syncDisplayCurrencyOptions() {
  const sel = syncDisplayCurrencyOptions.defaultSel;
  if (!sel || !document.contains(sel)) return;
  fillDisplayCurrencyOptions(sel);
}

/* ---------- 4) اختيار العملات المعروضة ---------- */
function sectionCurrencies() {
  const card = el('section', { class: 'card settings-section' });
  card.append(el('h2', { class: 'sec-title', text: t('settings.currencies') }));

  // بحث + عداد
  const search = el('input', {
    class: 'input', type: 'search', placeholder: t('settings.search'),
    'aria-label': t('settings.search'), 'data-i18n-attr': `placeholder:settings.search`,
  });
  search.addEventListener('input', () => { searchQ = search.value.trim().toLowerCase(); paintChips(); });

  const counter = el('span', { class: 'counter num', 'aria-live': 'polite' });
  const head = el('div', { class: 'cur-head' }, el('div', { class: 'search-wrap' }, search), counter);
  card.append(head);

  // بريسات سريعة
  const presets = el('div', { class: 'preset-row' });
  const presetBtns = [
    ['preset.default', () => applyList(DEFAULT_AR)],
    ['preset.gulf', () => applyList(listByRegion('gulf'))],
    ['preset.mena', () => applyList(listByRegion('mena', true))],
    ['preset.major', () => applyList(listByRegion('major', true))],
  ];
  for (const [key, fn] of presetBtns) {
    presets.append(el('button', {
      type: 'button', class: 'btn btn-ghost btn-sm rippleable', text: t(key), onclick: fn,
    }));
  }
  card.append(presets);

  // فلتر المناطق (chips)
  const filters = el('div', { class: 'filters' });
  const defs = [['all', 'settings.filterAll'], ['major', 'preset.major'], ['gulf', 'preset.gulf'], ['mena', 'preset.mena']];
  for (const [code, key] of defs) {
    filters.append(el('button', {
      type: 'button', class: 'chip f-chip rippleable', text: t(key), dataset: { region: code },
      onclick: (e) => { curFilter = code; filters.querySelectorAll('.f-chip').forEach(c => c.classList.toggle('active', c === e.currentTarget)); paintChips(); },
    }));
  }
  card.append(filters);

  // شبكة chips العملات
  const chips = el('div', { class: 'chips cur-chips', role: 'group', 'aria-label': t('settings.currencies') });
  card.append(chips);
  const paintChips = () => {
    chips.replaceChildren();
    for (const c of CURRENCIES) {
      if (curFilter !== 'all' && c.region !== curFilter) continue;
      const hay = `${c.code} ${c.ar} ${c.en} ${c.symbol}`.toLowerCase();
      if (searchQ && !hay.includes(searchQ)) continue;
      const active = get('currencies').includes(c.code);
      const chip = el('button', {
        type: 'button',
        class: `chip rippleable${active ? ' active' : ''}`,
        'aria-pressed': String(active),
        dataset: { code: c.code },
        onclick: () => { toggleCurrency(c.code); paintChips(); },
      },
        el('span', { class: 'chip-flag', text: flagEmoji(c.code), 'aria-hidden': 'true' }),
        el('span', { class: 'num', text: c.code }),
      );
      chips.append(chip);
    }
    counter.textContent = t('settings.counter', { n: get('currencies').length, total: CURRENCIES.length });
  };
  paintChips();

  return card;
}

const DEFAULT_AR = ['USD','EUR','GBP','JPY','CNY','TRY','SAR','AED','QAR','KWD','BHD','OMR','EGP','JOD','MAD','DZD','TND','LYD'];
function listByRegion(region, includeDefaults = false) {
  const list = CURRENCIES.filter(c => c.region === region).map(c => c.code);
  if (includeDefaults) list.push('USD');
  return [...new Set(list)];
}
function applyList(list) {
  if (!list.length) return toast(t('settings.minOne'), { kind: 'warn' });
  set({ currencies: list, displayCurrency: list.includes('EGP') ? 'EGP' : list[0] });
  toast(t('ui.saved'), { icon: '✓', kind: 'success', ms: 2000 });
}
function toggleCurrency(code) {
  const cur = get('currencies').slice();
  const idx = cur.indexOf(code);
  if (idx >= 0) {
    if (cur.length === 1) return toast(t('settings.minOne'), { kind: 'warn', icon: '⚠️' });
    cur.splice(idx, 1);
  } else cur.push(code);
  const patch = { currencies: cur };
  if (!cur.includes(get('displayCurrency'))) {
    patch.displayCurrency = cur.includes('EGP') ? 'EGP' : cur[0];
  }
  set(patch);
}

/* ---------- 5) الأصول المعروضة ---------- */
function sectionAssets() {
  const grid = el('div', { class: 'chips assets-chips', role: 'group', 'aria-label': t('settings.assets') });
  const paint = () => {
    grid.replaceChildren();
    for (const a of ASSETS) {
      const active = get('metals').includes(a.code);
      grid.append(el('button', {
        type: 'button',
        class: `chip asset-chip rippleable${active ? ' active' : ''}`,
        'aria-pressed': String(active),
        style: `--mc:${a.color}`,
        dataset: { code: a.code },
        onclick: () => toggleAsset(a.code),
      },
        el('span', { class: 'chip-flag', text: a.icon, 'aria-hidden': 'true' }),
        el('span', { text: get('lang') === 'ar' ? a.ar : a.en }),
      ));
    }
  };
  paint();
  subscribe((changed) => { if (changed.includes('metals')) paint(); });
  return section('settings.assets', grid);
}
function toggleAsset(code) {
  const cur = get('metals').slice();
  const i = cur.indexOf(code);
  if (i >= 0) {
    if (cur.length === 1) return toast(t('settings.minOneAsset'), { kind: 'warn', icon: '⚠️' });
    cur.splice(i, 1);
  } else cur.push(code);
  set({ metals: cur });
}

/* ---------- 6) مسح التفضيلات ---------- */
function sectionReset() {
  return section('settings.title', el('button', {
    type: 'button', class: 'btn btn-ghost btn-danger-ghost rippleable',
    text: t('settings.resetPrefs'),
    onclick: () => {
      try { localStorage.removeItem('prefs_v2'); } catch {}
      set({
        lang: 'ar', theme: 'dark',
        currencies: [...DEFAULT_AR],
        metals: ASSETS.map(a => a.code),
        displayCurrency: 'EGP',
      });
      setLang('ar');
      toast(t('settings.resetDone'), { icon: '✓', kind: 'success' });
      reBuildRef?.();
    },
  }));
}
