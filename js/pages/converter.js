/**
 * pages/converter.js — المحوّل — Phase 5
 * أصل واحد (معادن + كل العملات في منسدل واحد) → نتائج فورية لكل العملات الظاهرة
 * + قوالب سريعة (1 oz / 1 g / 10 g / 100 g للمعادن) + prefill من شريط الرئيسية.
 */

import { get, subscribe } from '../store.js';
import { ASSETS, CURRENCIES, CURRENCY_MAP, ASSET_MAP, flagEmoji, pricePerGramUSD } from '../pools.js';
import { convert } from '../money.js';
import { formatMoney, fmtSmart, iso } from '../format.js';
import { t } from '../i18n.js';
import { el, countUp } from '../ui.js';
import { refresh } from '../polling.js';

let state = { from: 'USD', amount: 1, unit: 'oz' };
let root = null;
let rowEls = new Map(); // code → span للتحديث الموضعي

export function renderConverter(container) {
  // قراءة prefill من شريط الفوركس (tile click)
  try {
    const pre = JSON.parse(sessionStorage.getItem('conv_prefill') || 'null');
    if (pre?.from && pre?.to) {
      state = { from: pre.to, amount: 1, unit: 'oz' }; // tile يبدأ بعملة
    }
    sessionStorage.removeItem('conv_prefill');
  } catch { /* لا شيء */ }

  root = el('section', { class: 'page converter' });

  // ---- بطاقة الإدخال
  const card = el('div', { class: 'card conv-card' });
  card.append(el('h1', { class: 'page-title', text: t('conv.title') }));

  const fromSel = el('select', { class: 'select rippleable', id: 'convFrom', 'aria-label': t('conv.from') });
  fillFrom(fromSel);
  fromSel.value = state.from;
  fromSel.addEventListener('change', () => { state.from = fromSel.value; updateUnitVisibility(); renderQuick(); update(); });

  const amountInput = el('input', {
    class: 'input num', type: 'number', inputmode: 'decimal', min: '0', step: 'any',
    value: String(state.amount), 'aria-label': t('conv.amount'),
  });
  amountInput.addEventListener('input', () => {
    state.amount = parseFloat(amountInput.value) || 0;
    update();
  });

  const unitBtns = el('div', { class: 'segmented', id: 'unitSeg', role: 'group', 'aria-label': t('conv.unit') });
  for (const [u, key] of [['oz', 'ui.oz'], ['g', 'ui.g']]) {
    unitBtns.append(el('button', {
      type: 'button', class: 'seg-btn rippleable', dataset: { unit: u },
      onclick: (e) => { state.unit = u; unitBtns.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === e.currentTarget)); renderQuick(); update(); },
    }, el('span', { text: t(key) })));
  }

  const quick = el('div', { class: 'chips quick-row', id: 'quickRow' });

  card.append(
    field(t('conv.from'), fromSel),
    el('div', { class: 'two-col' }, field(t('conv.amount'), amountInput), field(t('conv.unit'), unitBtns)),
    el('p', { class: 'hint', text: t('conv.quick'), 'data-i18n': 'conv.quick' }),
    quick,
    el('div', { class: 'usd-pill num', id: 'usdPill' }, el('small', { text: t('conv.usdValue') + ':' }), el('span', { id: 'usdVal' }, '—')),
  );

  // ---- بطاقة النتائج
  const results = el('div', { class: 'card results' });
  results.append(el('h2', { class: 'sec-title', text: t('conv.results') }));
  const rows = el('div', { class: 'r-rows' });
  for (const code of get('currencies')) {
    const c = CURRENCY_MAP.get(code);
    const row = el('button', { type: 'button', class: 'r-row' },
      el('span', { class: 'r-cur num', text: `${flagEmoji(code)} ${code}` }),
      el('span', { class: 'r-name text-dim', text: get('lang') === 'ar' ? c.ar : c.en }),
      el('span', { class: 'r-val num', text: '—' }),
    );
    rows.append(row);
    rowEls.set(code, row.querySelector('.r-val'));
  }
  results.append(rows);
  results.append(el('p', { class: 'hint', text: t('conv.allCurrencies') }));

  root.append(card, results);
  container.append(root);

  renderQuick();
  updateUnitVisibility();
  update();

  const unsub = subscribe((changed) => {
    if (changed.some(k => ['prices', 'usdRates', 'currencies'].includes(k))) update();
  });
  return () => { unsub(); root = null; rowEls = new Map(); };
}

function field(labelText, control) {
  return el('label', { class: 'field' }, el('span', { class: 'label', text: labelText }), control);
}

function fillFrom(sel) {
  sel.replaceChildren();
  const g1 = el('optgroup', { label: t('conv.metals') });
  for (const a of ASSETS) {
    g1.append(el('option', { value: a.code, text: `${a.icon} ${get('lang') === 'ar' ? a.ar : a.en} (${a.code})` }));
  }
  const g2 = el('optgroup', { label: t('conv.currencies') });
  for (const c of CURRENCIES) {
    g2.append(el('option', { value: c.code, text: `${flagEmoji(c.code)} ${c.code} — ${get('lang') === 'ar' ? c.ar : c.en}` }));
  }
  sel.append(g1, g2);
}

/** إظهار اختيار الوحدة للمعادن فقط */
function updateUnitVisibility() {
  const isMetal = !!ASSET_MAP.has(state.from);
  const seg = root.querySelector('#unitSeg');
  if (seg) seg.style.display = isMetal ? '' : 'none';
  if (!isMetal) state.unit = 'oz';
}

/** قوالب سريعة حسب نوع الأصل */
function renderQuick() {
  const row = root.querySelector('#quickRow');
  if (!row) return;
  row.replaceChildren();
  const isMetal = ASSET_MAP.has(state.from);
  const templates = isMetal
    ? [['1 oz', 1, 'oz'], ['1 g', 1, 'g'], ['10 g', 10, 'g'], ['100 g', 100, 'g']]
    : [[1], [10], [100], [1000]];

  for (const tpl of templates) {
    const label = isMetal
      ? `${formatMoney(tpl[1], { decimals: 0 })} ${t(tpl[2] === 'g' ? 'ui.g' : 'ui.oz')}`
      : formatMoney(tpl[0], { decimals: 0 });
    row.append(el('button', {
      type: 'button', class: 'chip rippleable', text: label,
      onclick: () => {
        if (isMetal) {
          state.amount = tpl[1]; state.unit = tpl[2];
          unitSegSync();
        } else {
          state.amount = tpl[0];
        }
        const inp = root.querySelector('.conv-card .input');
        if (inp) inp.value = String(state.amount);
        update();
      },
    }));
  }
}
function unitSegSync() {
  const seg = root.querySelector('#unitSeg');
  if (seg) seg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.unit === state.unit));
}

/** التحويل الكامل: أصل → USD → كل عملة ظاهرة */
function computeUSD() {
  if (ASSET_MAP.has(state.from)) {
    const code = state.from;
    const p = get('prices')[code]?.usd;
    if (!Number.isFinite(p)) return NaN;
    const perUnit = state.unit === 'g' ? pricePerGramUSD(code, p) : p;
    return perUnit * state.amount;
  }
  return convert(state.amount, state.from, 'USD');
}

function update() {
  if (!root) return;
  const usd = computeUSD();
  const usdEl = root.querySelector('#usdVal');
  if (usdEl) usdEl.textContent = Number.isFinite(usd) ? `$ ${formatMoney(usd)}` : '—';

  for (const code of get('currencies')) {
    const target = rowEls.get(code);
    if (!target) continue;
    const v = Number.isFinite(usd) ? convert(usd, 'USD', code) : NaN;
    if (Number.isFinite(v)) {
      countUp(target, v, { decimals: Math.abs(v) >= 10000 ? 0 : Math.abs(v) < 1 ? 4 : 2 });
    } else {
      target.textContent = '—';
    }
  }
}
