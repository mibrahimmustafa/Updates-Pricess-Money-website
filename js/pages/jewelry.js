/**
 * pages/jewelry.js — حاسبة المجوهرات — Phase 5
 * مدخلات: وزن / عيار / مصنعية / ضريبة VAT قابلة للإيقاف / مبشَّت (وزن + عيار) يخصم بسعر السوق.
 * الناتج مفصّل سطراً سطراً بالعملة الافتراضية مع إمكانية التبديل — يعاد حسابه فور أي تغيير.
 */

import { get, subscribe } from '../store.js';
import { CURRENCY_MAP, flagEmoji, pricePerGramUSD, KARATS } from '../pools.js';
import { convert } from '../money.js';
import { formatMoney, iso } from '../format.js';
import { t } from '../i18n.js';
import { el, toast } from '../ui.js';
import { refresh } from '../polling.js';

let state = {
  weight: 10, karat: '21K', making: 60, vat: true,
  cur: null,                 // null → displayCurrency
  old: { on: false, weight: 5, karat: '21K' },
};

let bpEls = {}; // بنود التفصيل الموضعية

export function renderJewelry(container) {
  state.cur = get('displayCurrency');

  const page = el('section', { class: 'page jewelry' });

  // ============ بطاقة المدخلات ============
  const card = el('div', { class: 'card jw-card' });
  card.append(el('h1', { class: 'page-title', text: t('jw.title') }));

  // الوزن
  const weight = numInput(state.weight, v => { state.weight = clamp(v, 0, 100000); calc(); });
  // المصنعية
  const making = numInput(state.making, v => { state.making = clamp(v, 0, 100000); calc(); });
  // العيار — segmented chips
  const karatSeg = karatChips(state.karat, k => { state.karat = k; calc(); });
  // ضريبة — switch
  const vatSwitch = switchInput(state.vat, on => { state.vat = on; calc(); });
  // العملة
  const curSel = currencySelect(v => { state.cur = v; calc(); });

  // المبشَّت
  const oldOn = switchInput(state.old.on, on => { state.old.on = on; oldBox.classList.toggle('enabled', on); calc(); });
  const oldWeight = numInput(state.old.weight, v => { state.old.weight = clamp(v, 0, 100000); calc(); });
  const oldKarat = karatChips(state.old.karat, k => { state.old.karat = k; calc(); }, true);

  const oldBox = el('div', { class: `jw-old${state.old.on ? ' enabled' : ''}` },
    el('div', { class: 'jw-old-head' },
      el('span', { class: 'label strong', text: t('jw.old') }),
      oldOn,
    ),
    el('p', { class: 'hint', text: t('jw.oldHint') }),
    el('div', { class: 'two-col' }, field(t('jw.oldWeight'), oldWeight), field(t('jw.oldKarat'), oldKarat)),
  );

  card.append(
    el('h2', { class: 'sec-title', text: t('jw.inputs') }),
    el('div', { class: 'two-col' }, field(t('jw.weight', {}), weight), field(t('jw.making'), making)),
    field(t('jw.karat'), karatSeg),
    el('div', { class: 'two-col' },
      field(t('jw.vat'), vatSwitch),
      field(t('jw.currency'), curSel),
    ),
    oldBox,
    el('p', { class: 'hint', text: t('jw.note') }),
  );

  // ============ بطاقة الناتج ============
  const res = el('div', { class: 'card jw-result' });
  res.append(el('h2', { class: 'sec-title', text: t('jw.breakdown') }));
  bpEls = {};
  const mkRow = (key, labelKey, cls = '') => {
    const r = el('div', { class: `bp-row ${cls}` },
      el('span', { class: 'bp-label', text: t(labelKey), 'data-i18n': labelKey }),
      el('span', { class: 'bp-val num', id: `bp-${key}` }, '—'),
    );
    bpEls[key] = r.querySelector('.bp-val');
    return r;
  };
  res.append(
    mkRow('gram', 'jw.gramPrice'),
    mkRow('metal', 'jw.metal'),
    mkRow('making', 'jw.makingLine'),
    mkRow('vat', 'jw.vatLine'),
    mkRow('old', 'jw.oldLine', 'negative'),
  );
  const totalSpan = el('span', { class: 'bp-val num gold bp-total', id: 'bp-total' }, '—');
  bpEls.total = totalSpan;
  res.append(el('div', { class: 'bp-total-row' },
    el('span', { class: 'bp-label', text: t('jw.total'), 'data-i18n': 'jw.total' }),
    totalSpan,
  ));

  page.append(card, res);
  container.append(page);
  calc();

  const unsub = subscribe((changed) => {
    if (changed.some(k => ['prices', 'usdRates'].includes(k))) calc();
  });
  return () => { unsub(); page.remove(); bpEls = {}; };
}

/* ---------- الحساب ---------- */
function calc() {
  if (!bpEls.gram) return;
  const sym = (CURRENCY_MAP.get(state.cur) || {}).symbol || state.cur;
  const prices = get('prices');
  const gUSD = pricePerGramUSD('XAU', prices.XAU?.usd);
  const setRow = (key, v, prefix = '') => {
    const node = bpEls[key];
    if (!node) return;
    if (!Number.isFinite(v)) { node.textContent = '—'; node.dataset.v = ''; return; }
    node.textContent = `${prefix}${iso(formatMoney(v))} ${sym}`;
    node.dataset.v = String(v);
  };

  if (!Number.isFinite(gUSD)) {
    for (const k of ['gram', 'metal', 'making', 'vat', 'old', 'total']) setRow(k, NaN);
  } else {
    const gramCur = convert(gUSD, 'USD', state.cur);
    const payingPurity = KARATS[state.karat] ?? 1;
    const metal = gramCur * state.weight * payingPurity;
    const making = state.making * state.weight;
    const vat = state.vat ? (metal + making) * 0.14 : 0;
    const oldPurity = KARATS[state.old.karat] ?? 1;
    const oldVal = state.old.on ? gramCur * state.old.weight * oldPurity : 0;
    const total = metal + making + vat - oldVal;

    setRow('gram', gramCur);
    setRow('metal', metal);
    setRow('making', making);
    setRow('vat', vat);
    setRow('old', oldVal, '− ');
    setRow('total', Math.max(0, total));
  }
}

/* ---------- عناصر إدخال مشتركة ---------- */
function numInput(value, onchange) {
  const inp = el('input', {
    class: 'input num', type: 'number', inputmode: 'decimal', min: '0', step: 'any', value: String(value),
  });
  inp.addEventListener('input', () => onchange(parseFloat(inp.value)));
  return inp;
}
function clamp(v, min, max) {
  v = Number(v);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}
function switchInput(checked, onchange) {
  const lab = el('label', { class: 'switch' });
  const inp = el('input', { type: 'checkbox' });
  inp.checked = !!checked;
  inp.addEventListener('change', () => onchange(inp.checked));
  lab.append(inp, el('span', { class: 'slider', 'aria-hidden': 'true' }));
  lab.setAttribute('role', 'switch');
  function sync() { lab.setAttribute('aria-checked', String(inp.checked)); }
  inp.addEventListener('change', sync);
  sync();
  return lab;
}
function karatChips(current, onPick, small = false) {
  const wrap = el('div', { class: `chips karat-chips${small ? ' small' : ''}`, role: 'group' });
  const sync = () => wrap.querySelectorAll('.chip').forEach(c => {
    const active = c.dataset.k === current;
    c.classList.toggle('active', active);
    c.setAttribute('aria-pressed', String(active));
  });
  for (const k of Object.keys(KARATS)) {
    const c = el('button', {
      type: 'button', class: `chip rippleable${k === current ? ' active' : ''}`,
      'aria-pressed': String(k === current), dataset: { k },
      onclick: (e) => { onPick(k); sync(); },
    }, el('span', { class: 'num', text: k }));
    wrap.append(c);
  }
  return wrap;
}
function currencySelect(onchange) {
  const sel = el('select', { class: 'select rippleable', 'aria-label': t('jw.currency') });
  const fill = () => {
    if (!document.contains(sel)) return;
    sel.replaceChildren();
    for (const code of get('currencies')) {
      const c = CURRENCY_MAP.get(code);
      sel.append(el('option', { value: code, text: `${flagEmoji(code)} ${code} (${c.symbol})` }));
    }
    sel.value = get('currencies').includes(state.cur) ? state.cur : get('displayCurrency');
  };
  fill();
  sel.addEventListener('change', () => onchange(sel.value));
  subscribe((changed) => {
    if (changed.includes('currencies') || changed.includes('displayCurrency')) {
      if (!get('currencies').includes(state.cur)) state.cur = get('displayCurrency');
      fill();
      calc();
    }
  });
  return sel;
}
function field(labelText, control) {
  return el('label', { class: 'field' }, el('span', { class: 'label', text: labelText }), control);
}
