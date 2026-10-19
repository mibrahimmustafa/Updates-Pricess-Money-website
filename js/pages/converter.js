/**
 * pages/converter.js — المحوّل — Phase 5.1
 * أصل واحد (كل المعادن + كل العملات في منسدل واحد) + قوالب سريعة
 * + نتائج فورية لكل العملات الظاهرة. الحساب موحّد عبر money.js.
 */

import { get, subscribe } from '../store.js';
import { ASSETS, CURRENCIES, ASSET_MAP, flagEmoji } from '../pools.js';
import { formatMoney } from '../format.js';
import { convert, usdPerUnit, usdPerGram, sensibleDecimals } from '../money.js';
import { t } from '../i18n.js';
import * as ui from '../ui.js';
import { assetName, curName, curFlag, curSymbol, lang } from '../names.js';

const Q_PRESETS_METAL = [
  { key: 'conv.q1oz', unit: 'oz', mult: 1 },
  { key: 'conv.q1g', unit: 'g', mult: 1 },
  { key: 'conv.q10g', unit: 'g', mult: 10 },
  { key: 'conv.q100g', unit: 'g', mult: 100 },
];

export function renderConverter(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title">${t('conv.title')}</h1>
    <div class="conv-terminal card">
      <div class="jew-form">
        <div data-slot="src"></div>
        <div data-slot="amount"></div>
      </div>
      <div data-slot="presets"></div>
    </div>
    <div class="card">
      <h2 class="section-title">${t('conv.results')}</h2>
      <div class="conv-result-list" data-slot="results"></div>
      <p class="empty-note" data-slot="wait">${t('conv.noRates')}</p>
    </div>`;

  container.append(el);
  ui.bindRipples(el);

  const srcSlot = el.querySelector('[data-slot=src]');
  const amountSlot = el.querySelector('[data-slot=amount]');
  const presetsSlot = el.querySelector('[data-slot=presets]');
  const resultsSlot = el.querySelector('[data-slot=results]');
  const waitSlot = el.querySelector('[data-slot=wait]');

  let src = 'USD';
  let amountV = 100;
  let unit = 'oz'; // للمعادن: oz | g

  /* --- مصدر واحد ذكي: معادن ثم عملات --- */
  const l = lang();
  const srcSelect = ui.selectEl({
    label: t('conv.from'),
    value: src,
    onchange: v => { src = v; unit = ASSET_MAP.get(v)?.unit || 'oz'; paintPresets(); paint(); },
    options: [
      {
        group: 'M',
        groupLabel: l === 'ar' ? 'معادن وأصول' : 'Metals & assets',
        items: ASSETS.map(a => ({ value: a.code, text: `${a.icon} ${a[l] || a.en}` })),
      },
      {
        group: 'C',
        groupLabel: l === 'ar' ? 'عملات' : 'Currencies',
        items: CURRENCIES.map(c => ({ value: c.code, text: `${flagEmoji(c.code)} ${c[l] || c.en}` })),
      },
    ],
  });
  srcSlot.append(srcSelect);

  const amount = ui.numberInput({
    label: t('conv.amount'),
    value: amountV, min: 0, step: 10,
    onInput: v => { amountV = v; paint(); },
  });
  amountSlot.append(amount);

  function paintPresets() {
    presetsSlot.replaceChildren();
    const a = ASSET_MAP.get(src);
    if (!a) return; // عملات → لا قوالب
    const items = a.unit === 'coin'
      ? [{ key: 'conv.q1coin', unit: 'coin', mult: 1 }]
      : a.unit === 'lb'
        ? [{ key: 'conv.q1oz', unit: 'lb', mult: 1 }]
        : Q_PRESETS_METAL;
    const lbl = document.createElement('span');
    lbl.className = 'field-label';
    lbl.textContent = t('conv.quick');
    const row = document.createElement('div');
    row.className = 'chip-row';
    items.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t(p.key);
      b.addEventListener('click', () => {
        unit = p.unit;
        amountV = p.mult;
        amount.querySelector('input').value = amountV;
        paint();
      });
      row.append(b);
    });
    presetsSlot.append(lbl, row);
  }

  /** قيمة المصدر بالدولار (بحسب الوحدة)، أو null بانتظار الأسعار */
  function sourceUsd() {
    const a = ASSET_MAP.get(src);
    if (a) {
      if (a.unit === 'coin') return usdPerUnit(src) == null ? null : usdPerUnit(src) * amountV;
      if (a.unit === 'lb') return usdPerUnit(src) == null ? null : usdPerUnit(src) * amountV;
      if (unit === 'g') return usdPerGram(src) == null ? null : usdPerGram(src) * amountV;
      return usdPerUnit(src) == null ? null : usdPerUnit(src) * amountV;
    }
    return convert(amountV, src, 'USD');
  }

  function paint() {
    // suffix حي بجانب الحقل
    const suffixEl = amount.querySelector('.num-suffix');
    const a = ASSET_MAP.get(src);
    const suffixText = a ? (unit === 'g' ? t('conv.grams') : a.unit === 'coin' ? '' : a.unit) : src;
    if (suffixEl) suffixEl.textContent = suffixText;
    else if (suffixText) {
      const s = document.createElement('span');
      s.className = 'num-suffix';
      s.textContent = suffixText;
      amount.querySelector('.number-box').append(s);
    }
    amount._null_guard = null; // لا تحط

    const usd = sourceUsd();
    const rates = get('usdRates') || {};
    const codes = get('currencies') || [];
    const anyRates = codes.some(c => c !== 'USD' && rates[c] != null) || rates.USD != null;
    if (usd == null || !anyRates) {
      resultsSlot.replaceChildren();
      waitSlot.hidden = false;
      return;
    }
    waitSlot.hidden = true;
    resultsSlot.innerHTML = codes.map((c, i) => {
      const val = convert(usd, 'USD', c);
      return `
        <div class="conv-result" style="animation-delay:${Math.min(i * 25, 250)}ms">
          <span class="cr-cur"><span class="fx-flag-small">${curFlag(c)}</span>${curName(c)}</span>
          <span class="cr-val num" dir="ltr">${val == null ? '—' : formatMoney(val, { decimals: sensibleDecimals(val) })}</span>
          <span class="cr-sym">${curSymbol(c)}</span>
        </div>`;
    }).join('');
  }

  const unsub = subscribe(changed => {
    if (changed.some(c => ['prices', 'usdRates', 'currencies', 'displayCurrency'].includes(c))) paint();
  });
  paintPresets();
  paint();
  return () => unsub();
}
