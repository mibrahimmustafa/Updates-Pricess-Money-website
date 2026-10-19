/**
 * pages/timemachine.js — آلة الزمن — Phase 7.2
 * مقارنة قيمة قطعة ذهب (وزن × عيار) بين 2015 واليوم بأي عملة ظاهرة + نسبة النمو.
 * الأساس:
 *  - سعر الذهب 2015: متوسط سنوي معروف ≈ $1,160/أونصة (ثابت إرشادي منشور في الأدبيات).
 *  - سعر صرف 2015: Frankfurter التاريخي؛ إن غابت العملة → مرتبطة بالدولار (سعر اليوم) أو مرساة معروفة (EGP 2015 = 7.83).
 */

import { get, subscribe } from '../store.js';
import { CURRENCY_MAP, ASSET_MAP, flagEmoji, KARATS, TROY_OZ_GRAMS, pricePerGramUSD } from '../pools.js';
import * as api from '../api.js';
import { convert } from '../money.js';
import { formatMoney, iso, utcDate } from '../format.js';
import { t } from '../i18n.js';
import { el } from '../ui.js';

/** مراسي تاريخية معروفة (قيم إرشادية منشورة) */
const GOLD_2015_USD_OZ = 1160;      // متوسط 2015 التقريبي
const ANCHOR_EGP_2015 = 7.83;       // السعر الرسمي المصري في 2015
const PEGGED = new Set(['SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD']); // مرتبطة بالدولار

let state = { weight: 10, karat: '21K', cur: null };
let root = null;
let tok = 0;
let tmEls = null;

export function renderTimeMachine(container) {
  state.cur = get('displayCurrency');
  root = el('section', { class: 'page timemachine' });

  const card = el('div', { class: 'card tm-card' });
  card.append(el('h1', { class: 'page-title', text: t('tm.title') }),

  );

  const weight = el('input', {
    class: 'input num', type: 'number', inputmode: 'decimal', min: '1', step: 'any', value: String(state.weight),
  });
  weight.addEventListener('input', () => {
    const v = parseFloat(weight.value);
    if (Number.isFinite(v) && v > 0) { state.weight = v; calc(); }
  });

  const karatSeg = el('div', { class: 'segmented', role: 'group' });
  for (const k of Object.keys(KARATS)) {
    karatSeg.append(el('button', {
      type: 'button', class: `seg-btn rippleable${k === state.karat ? ' active' : ''}`, dataset: { k },
      onclick: (e) => { state.karat = k; karatSeg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === e.currentTarget)); calc(); },
    }, el('span', { text: k })));
  }

  const curSel = el('select', { class: 'select rippleable', 'aria-label': t('tm.currency') });
  for (const code of get('currencies')) {
    curSel.append(el('option', { value: code, text: `${flagEmoji(code)} ${code}` }));
  }
  curSel.value = state.cur;
  curSel.addEventListener('change', () => { state.cur = curSel.value; calc(); });

  card.append(
    el('div', { class: 'two-col' }, field(t('tm.weight'), weight), field(t('tm.karat'), karatSeg)),
    field(t('tm.currency'), curSel),
  );

  // ============ بطاقتا المقارنة ============
  const cards = el('div', { class: 'tm-cards' });
  tmEls = {
    then: tmValueCell('tm.then', '2015'),
    now: tmValueCell('tm.now', String(new Date().getFullYear())),
  };
  cards.append(tmEls.then.box, tmEls.now.box);

  const growth = el('div', { class: 'tm-growth-wrap' },
    el('span', { class: 'tm-growth-label', text: t('tm.growth'), 'data-i18n': 'tm.growth' }),
    el('span', { class: 'tm-growth num', id: 'tmGrowth' }, '—'),
  );

  root.append(card, cards, growth, el('p', { class: 'hint', text: t('tm.note') }));
  container.append(root);
  calc();

  const unsub = subscribe((changed) => {
    if (changed.some(k => ['prices', 'usdRates', 'currencies'].includes(k)) && !document.hidden) calc();
  });
  return () => { unsub(); root = null; tmEls = null; };
}

function tmValueCell(labelKey, year) {
  const value = el('span', { class: 'tm-value num' }, '—');
  const gram = el('span', { class: 'tm-gram num' }, '—');
  const box = el('div', { class: 'card tm-card-v' },
    el('span', { class: 'tm-year num', text: year }),
    el('span', { class: 'label', text: t(labelKey), 'data-i18n': labelKey }),
    value, gram);
  return { box, value, gram };
}

async function calc() {
  if (!tmEls || !document.contains(root)) return;
  const myTok = ++tok;
  const cur = state.cur;
  const purity = KARATS[state.karat] ?? 1;
  const sym = CURRENCY_MAP.get(cur)?.symbol || cur;  // اليوم
  const gToday = convert(pricePerGramUSD('XAU', get('prices').XAU?.usd), 'USD', cur);
  const totalToday = gToday * purity * state.weight;
  tmEls.now.value.innerHTML = Number.isFinite(totalToday) ? `${iso(formatMoney(totalToday))} ${sym}` : '—';
  tmEls.now.gram.textContent = `${t('tm.gram')}: ${iso(formatMoney(gToday * purity))} ${sym}`;

  const growthEl = root.querySelector('#tmGrowth');

  // 2015 — طلب واحد للمدى + مراسي fallback
  const rate2015 = await rate2015For(cur);
  if (myTok !== tok || !tmEls) return;

  const g2015USD = GOLD_2015_USD_OZ / TROY_OZ_GRAMS;
  if (rate2015.rate == null) {
    // لا تاريخ لهذه العملة → عرض 2015 بالدولار مباشرة بلا نسبة نمو (عملتان مختلفتان)
    const gUSD2015 = g2015USD * purity;
    paintThen(gUSD2015 * state.weight, gUSD2015, '$', rateInfoBadge(cur, rate2015.mode));
    if (growthEl) growthEl.textContent = '—';
    return;
  }

  const g2015 = g2015USD * purity * rate2015.rate;
  const total2015 = g2015 * state.weight;
  paintThen(total2015, g2015, sym, rateInfoBadge(cur, rate2015.mode));

  // النمو
  if (growthEl && Number.isFinite(totalToday) && total2015 > 0) {
    const pct = ((totalToday / total2015) - 1) * 100;
    growthEl.textContent = `${pct >= 0 ? '▲ +' : '▼ '}${iso(pct.toFixed(1))}%`;
    growthEl.classList.toggle('up', pct >= 0);
    growthEl.classList.toggle('down', pct < 0);
  }
}

/** سعر صرف العملة في 2015 مع مراسي واضحة */
async function rate2015For(cur) {
  if (cur === 'USD') return { rate: 1, mode: 'usd' };
  try {
    const hist = await api.getHistory('2015-06-01', '2015-06-30', [cur]);
    const dates = hist.map(h => h?.values?.[cur]).filter(Number.isFinite).map(Number);
    if (dates.length) return { rate: dates[dates.length - 1], mode: 'fx' };
  } catch { /* fallback أدناه */ }
  if (PEGGED.has(cur)) {
    const peg = get('usdRates')[cur];
    return { rate: Number.isFinite(peg) ? peg : null, mode: 'peg' };
  }
  if (cur === 'EGP') return { rate: ANCHOR_EGP_2015, mode: 'anchor' };
  return { rate: null, mode: 'missing' };
}

function rateInfoBadge(cur, mode) {
  if (mode === 'peg') return t('tm.pegged');
  if (mode === 'anchor') return t('tm.anchor');
  if (mode === 'missing') return t('tm.missing');
  return '';
}
function paintThen(total, gram, symbol, badgeText) {
  tmEls.then.value.innerHTML = Number.isFinite(total) ? `${iso(formatMoney(total))} ${symbol}` : '—';
  tmEls.then.gram.textContent = `${t('tm.gram')}: ${Number.isFinite(gram) ? iso(formatMoney(gram)) + ' ' + symbol : '—'}`;
  let note = tmEls.then.box.querySelector('.tm-note');
  if (!note) {
    note = el('p', { class: 'hint tm-note' });
    tmEls.then.box.append(note);
  }
  note.textContent = badgeText || '';
}
function nudge(node, text) {
  if (!text) { node.textContent = ''; return; }
  node.textContent = text;
}
/* نُقل منطق الملاحظة داخل paintThen — لا حاجة لمساعدات إضافية */


function field(labelText, control) {
  return el('label', { class: 'field' }, el('span', { class: 'label', text: labelText }), control);
}
