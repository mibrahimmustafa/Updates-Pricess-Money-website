/**
 * pages/settings.js — الإعدادات — Phase 4 (تخصيص كامل)
 * اللغة + المظهر + العملة الافتراضية + اختيار العملات والأصول المعروضة
 * بحث/فلترة/بريسات + عداد + حماية من التفريغ — كل شيء عبر store ويُحفظ فوراً.
 */

import { get, set, subscribe } from '../store.js';
import { CURRENCIES, ASSETS, DEFAULT_CURRENCIES, DEFAULT_ASSETS, flagEmoji } from '../pools.js';
import { t } from '../i18n.js';
import { setLang } from '../i18n.js';
import * as ui from '../ui.js';
import { curName, curSymbol, lang } from '../names.js';

export function renderSettings(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title">${t('settings.title')}</h1>

    <div class="card settings-group">
      <h2 class="section-title">${t('settings.lang')}</h2>
      <div data-slot="lang"></div>
      <h2 class="section-title">${t('settings.theme')}</h2>
      <div data-slot="theme"></div>
      <div data-slot="display"></div>
      <span class="text-dim" style="font-size:12px">${t('settings.saving')}</span>
    </div>

    <div class="card settings-group">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 class="section-title">${t('settings.currencies')}</h2>
        <span class="counter-chip" data-slot="counter"></span>
      </div>
      <div class="search-box">
        <span class="sb-icon" aria-hidden="true">🔍</span>
        <input class="field-input" data-slot="search" type="search" placeholder="${t('settings.search')}" aria-label="${t('settings.search')}">
      </div>
      <div data-slot="regionChips"></div>
      <div class="setting-row">
        <span class="field-label">${t('settings.presets')}</span>
        <div class="chip-row" data-slot="presets"></div>
      </div>
      <div class="chip-row" data-slot="curChips" style="max-height:330px;overflow:auto;padding:2px"></div>
      <p class="empty-note" data-slot="noResult" hidden>${t('settings.emptySearch')}</p>
    </div>

    <div class="card settings-group">
      <h2 class="section-title">${t('settings.assets')}</h2>
      <div class="chip-row" data-slot="assetChips"></div>
    </div>`;

  container.append(el);
  ui.bindRipples(el);

  const slots = {
    lang: el.querySelector('[data-slot=lang]'),
    theme: el.querySelector('[data-slot=theme]'),
    display: el.querySelector('[data-slot=display]'),
    counter: el.querySelector('[data-slot=counter]'),
    search: el.querySelector('[data-slot=search]'),
    regionChips: el.querySelector('[data-slot=regionChips]'),
    presets: el.querySelector('[data-slot=presets]'),
    curChips: el.querySelector('[data-slot=curChips]'),
    noResult: el.querySelector('[data-slot=noResult]'),
    assetChips: el.querySelector('[data-slot=assetChips]'),
  };

  let regionFilter = 'ALL';
  let query = '';

  function buildLangTheme() {
    slots.lang.replaceChildren(ui.segmented({
      value: get('lang'),
      options: [{ value: 'ar', text: '🇪🇬 ' + t('settings.lang.ar') }, { value: 'en', text: '🇺🇸 ' + t('settings.lang.en') }],
      onChange: v => { setLang(v); applyI18nLater(v); },
    }));
    slots.theme.replaceChildren(ui.segmented({
      value: get('theme'),
      options: [
        { value: 'dark', text: '🌙 ' + t('settings.theme.dark') },
        { value: 'light', text: '☀️ ' + t('settings.theme.light') },
        { value: 'system', text: '🖥️ ' + t('settings.theme.system') },
      ],
      onChange: v => set({ theme: v }),
    }));
  }
  // إعادة تطبيق القاموس على الشل (topbar/nav) فور تبديل اللغة
  function applyI18nLater() {
    import('../i18n.js').then(m => m.applyI18n());
  }

  function buildDisplay() {
    slots.display.replaceChildren(ui.selectEl({
      label: t('settings.displayCurrency'),
      value: get('displayCurrency'),
      options: (get('currencies') || []).map(c => ({ value: c, text: `${flagEmoji(c)} ${curName(c)} · ${curSymbol(c)}` })),
      onchange: v => set({ displayCurrency: v }),
    }));
  }

  function matches(c) {
    const q = query.trim().toLowerCase();
    if (!q) return regionFilter === 'ALL' ? true : c.region === regionFilter;
    const hay = `${c.code} ${c.ar} ${c.en} ${c.symbol}`.toLowerCase();
    if (!hay.includes(q)) return false;
    return regionFilter === 'ALL' ? true : c.region === regionFilter;
  }

  function buildCurrencyChips() {
    const shown = CURRENCIES.filter(matches);
    slots.noResult.hidden = shown.length > 0;
    slots.curChips.replaceChildren(...shown.map(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + ((get('currencies') || []).includes(c.code) ? ' is-on' : '');
      b.dataset.value = c.code;
      b.innerHTML = `<span class="f">${flagEmoji(c.code)}</span>${c.code}`;
      b.title = curName(c.code);
      b.addEventListener('click', () => {
        const list = [...(get('currencies') || [])];
        const i = list.indexOf(c.code);
        if (i >= 0) {
          if (list.length <= 1) { // حماية من التفريغ
            ui.toast(t('settings.minOne'), { icon: '🛡️' });
            b.classList.add('is-on');
            return;
          }
          list.splice(i, 1);
          b.classList.remove('is-on');
        } else {
          list.push(c.code);
          b.classList.add('is-on');
        }
        set({ currencies: list });
        paintCounter();
        buildDisplay();
        ripplesRefresh();
      });
      return b;
    }));
  }

  function buildRegionChips() {
    slots.regionChips.replaceChildren(ui.segmented({
      value: regionFilter,
      options: [
        { value: 'ALL', text: t('settings.all') },
        { value: 'major', text: t('settings.major') },
        { value: 'gulf', text: t('settings.gulf') },
        { value: 'mena', text: t('settings.mena') },
      ],
      onChange: v => { regionFilter = v; buildCurrencyChips(); },
    }));
  }

  function buildPresets() {
    slots.presets.replaceChildren();
    [
      { key: 'settings.preset.gulf', run: () => CURRENCIES.filter(c => c.region === 'gulf').map(c => c.code) },
      { key: 'settings.preset.mena', run: () => CURRENCIES.filter(c => c.region === 'mena').map(c => c.code) },
      { key: 'settings.preset.default', run: () => [...DEFAULT_CURRENCIES] },
    ].forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t(p.key);
      b.addEventListener('click', () => {
        const disp = get('displayCurrency');
        const list = p.run();
        set({ currencies: list, displayCurrency: list.includes(disp) ? disp : (list.includes('EGP') ? 'EGP' : list[0]) });
        buildCurrencyChips(); paintCounter(); buildDisplay();
        ui.toast('✓ ' + t(p.key), { icon: '⚡' });
        ripplesRefresh();
      });
      slots.presets.append(b);
    });
  }

  function paintCounter() {
    slots.counter.textContent = t('settings.counter', { shown: (get('currencies') || []).length, all: CURRENCIES.length });
  }

  function buildAssetChips() {
    slots.assetChips.replaceChildren(...ASSETS.map(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + ((get('metals') || []).includes(a.code) ? ' is-on' : '');
      b.innerHTML = `<span>${a.icon}</span>${a.code}`;
      b.title = a[lang()] || a.en;
      b.addEventListener('click', () => {
        const list = [...(get('metals') || [])];
        const i = list.indexOf(a.code);
        if (i >= 0) {
          if (list.length <= 1) { ui.toast(t('settings.minOne'), { icon: '🛡️' }); return; }
          list.splice(i, 1); b.classList.remove('is-on');
        } else { list.push(a.code); b.classList.add('is-on'); }
        set({ metals: list });
        ripplesRefresh();
      });
      return b;
    }));
  }

  function ripplesRefresh() {
    import('../ui.js').then(m => m.bindRipples(el));
  }

  buildLangTheme();
  buildDisplay();
  buildRegionChips();
  buildPresets();
  buildCurrencyChips();
  paintCounter();
  buildAssetChips();

  slots.search.addEventListener('input', () => {
    query = slots.search.value || '';
    buildCurrencyChips();
  });

  const unsub = subscribe(changed => {
    if (changed.includes('lang')) {
      buildLangTheme(); buildCurrencyChips(); buildAssetChips(); buildDisplay(); paintCounter();
      slots.search.placeholder = t('settings.search');
    }
    if (changed.includes('currencies')) { paintCounter(); buildDisplay(); }
  });
  return () => unsub();
}
