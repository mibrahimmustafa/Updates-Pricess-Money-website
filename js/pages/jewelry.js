/**
 * pages/jewelry.js — حاسبة المجوهرات — Phase 5.2
 * مدخلات: وزن/عيار/مصنعية/ضريبة 14% قابلة للإيقاف/مبشَّت بوزنه وعياره يُخصم بسعر السوق.
 * الناتج مفصّل سطراً سطراً — الحساب موحّد عبر karatUsdPerGram + convert.
 */

import { get, subscribe } from '../store.js';
import { KARATS } from '../pools.js';
import { formatMoney } from '../format.js';
import { karatUsdPerGram, convert, sensibleDecimals } from '../money.js';
import { t } from '../i18n.js';
import * as ui from '../ui.js';
import { curName, curFlag, curSymbol } from '../names.js';

export function renderJewelry(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title">${t('jew.title')}</h1>
    <div class="jew-form card">
      <div data-slot="weight"></div>
      <div data-slot="karat"></div>
      <div data-slot="work"></div>
      <div data-slot="currency"></div>
    </div>
    <div class="card">
      <div data-slot="vat"></div>
      <div class="buyback-block" data-slot="buybackBlock">
        <div class="jew-subtitle" style="padding-block:8px 4px">${t('jew.buyback')}</div>
        <div class="jew-form">
          <div data-slot="bbWeight"></div>
          <div data-slot="bbKarat"></div>
        </div>
      </div>
    </div>
    <div class="card">
      <h2 class="section-title">${t('jew.total')}</h2>
      <div class="jew-lines" data-slot="lines"></div>
      <div class="jew-total"><span class="field-label" style="font-size:14px">${t('jew.total')}</span><span class="jt-val" data-slot="total">—</span></div>
      <p class="empty-note" data-slot="wait">${t('jew.wait')}</p>
    </div>`;

  container.append(el);
  ui.bindRipples(el);

  /* الحالة: تُحفظ موضعياً (وحدة الجلسة) */
  const S = {
    weight: 10,
    karat: '21K',
    work: 60,          // مصنعية لكل جرام (ببالعملة)
    currency: get('displayCurrency') || 'EGP',
    vat: true,
    buyback: false,
    bbWeight: 10,
    bbKarat: '18K',
  };

  const slots = {
    weight: el.querySelector('[data-slot=weight]'),
    karat: el.querySelector('[data-slot=karat]'),
    work: el.querySelector('[data-slot=work]'),
    currency: el.querySelector('[data-slot=currency]'),
    vat: el.querySelector('[data-slot=vat]'),
    buybackBlock: el.querySelector('[data-slot=buybackBlock]'),
    bbWeight: el.querySelector('[data-slot=bbWeight]'),
    bbKarat: el.querySelector('[data-slot=bbKarat]'),
    lines: el.querySelector('[data-slot=lines]'),
    total: el.querySelector('[data-slot=total]'),
    wait: el.querySelector('[data-slot=wait]'),
  };

  slots.weight.append(ui.numberInput({
    label: t('jew.weight'), value: S.weight, min: 0.1, step: 1,
    suffix: 'g',
    onInput: v => { S.weight = v || S.weight; calc(); },
  }));

  slots.karat.append(ui.segmented({
    value: S.karat,
    options: Object.keys(KARATS).map(k => ({ value: k, text: k })),
    onChange: v => { S.karat = v; calc(); },
  }));

  slots.work.append(ui.numberInput({
    label: t('jew.workmanship'), value: S.work, min: 0, step: 10,
    suffix: curSymbol(S.currency),
    onInput: v => { S.work = v || S.work; calc(); },
  }));

  function currencySelect() {
    slots.currency.replaceChildren(ui.selectEl({
      label: t('jew.currency'),
      value: S.currency,
      options: (get('currencies') || []).map(c => ({ value: c, text: `${curFlag(c)} ${curName(c)}` })),
      onchange: v => { S.currency = v; slots.work.querySelector('.num-suffix').textContent = curSymbol(v); calc(); },
    }));
  }
  currencySelect();

  const vatSwitch = ui.switchEl({
    label: t('jew.vat'), checked: S.vat,
    onChange: v => { S.vat = v; calc(); },
  });
  slots.vat.append(vatSwitch);

  const bbSwitch = ui.switchEl({
    label: t('jew.buyback.on'), checked: S.buyback,
    onChange: v => { S.buyback = v; slots.buybackBlock.hidden = !v; calc(); },
  });
  slots.buybackBlock.prepend(bbSwitch);

  const bbWeightInput = ui.numberInput({
    label: t('jew.buyback.weight'), value: S.bbWeight, min: 0, step: 1, suffix: 'g',
    onInput: v => { S.bbWeight = v || S.bbWeight; calc(); },
  });
  slots.bbWeight.append(bbWeightInput);

  const bbKaratSeg = () => {
    slots.bbKarat.replaceChildren(ui.segmented({
      value: S.bbKarat,
      options: Object.keys(KARATS).map(k => ({ value: k, text: k })),
      onChange: v => { S.bbKarat = v; calc(); },
    }));
  };
  bbKaratSeg();

  /* ---- الحساب سطراً سطراً ---- */
  function calc() {
    const ug = karatUsdPerGram(S.karat); // دولار لكل جرام بالعيار
    const rates = get('usdRates') || {};
    const cur = S.currency;
    const rate = ug != null ? convert(1, 'USD', cur) : null;
    if (ug == null || rate == null) { waitSlot.hidden = false; slots.total.textContent = '—'; slots.lines.replaceChildren(); return; }
    waitSlot.hidden = true;

    const metalV = ug * S.weight * rate;
    const workV = S.work * S.weight;
    const vatV = S.vat ? 0.14 * (metalV + workV) : 0;
    const bbUg = karatUsdPerGram(S.bbKarat);
    const bbV = S.buyback && bbUg != null ? bbUg * S.bbWeight * rate : 0;
    const grandV = metalV + workV + vatV - bbV;

    const fmt = v => formatMoney(Math.abs(v) < 1e-12 ? 0 : v, { decimals: sensibleDecimals(v) });
    const sym = curSymbol(cur);
    const row = (label, val, cls = '') => `
      <div class="jew-line"><span class="jl-label">${label}</span>
        <span class="jl-val num ${cls}" dir="ltr">${fmt(val)} <span style="color:var(--text-faint)">${sym}</span></span></div>`;

    slots.lines.innerHTML = [
      row(t('jew.line.metal'), metalV),
      row(t('jew.line.work'), workV),
      S.vat ? row(t('jew.line.vat'), vatV) : '',
      S.buyback ? row(t('jew.line.buyback'), -bbV, 'diff-near') : '',
    ].filter(Boolean).join('');
    slots.total.innerHTML = `${formatMoney(grandV, { decimals: 2 })} <span style="font-size:15px;color:var(--text-faint)">${sym}</span>`;
  }

  const unsub = subscribe(changed => {
    if (changed.some(c => ['prices', 'usdRates', 'currencies', 'displayCurrency'].includes(c))) {
      currencySelect(); calc();
    }
  });
  calc();
  return () => unsub();
}
