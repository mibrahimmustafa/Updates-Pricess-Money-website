/**
 * pages/cbe.js — أسعار البنك المركزي المصري (CBE) — Phase 8
 * جدول: العملة | رسمي CBE | السوق الحي | الفرق | الفرق % — تلوين الانحراف + بحث + skeleton + fallback.
 */

import { get, subscribe } from '../store.js';
import { CURRENCY_MAP, flagEmoji } from '../pools.js';
import * as api from '../api.js';
import { convert } from '../money.js';
import { formatMoney, iso, fmtSmart } from '../format.js';
import { t } from '../i18n.js';
import { el, toast } from '../ui.js';
import { refresh } from '../polling.js';

let cbeMap = null;     // {quote: {rate, date}}
let cbeDate = '';
let searchQ = '';
let root = null;
let toc = 0;

export function renderCBE(container) {
  root = el('section', { class: 'page cbe' });

  const card = el('div', { class: 'card cbe-card' });
  card.append(el('h1', { class: 'page-title', text: t('cbe.title') }));
  card.append(el('p', { class: 'hint', text: t('cbe.note') }));

  const search = el('input', {
    class: 'input', type: 'search', placeholder: t('cbe.search'),
    'data-i18n-attr': 'placeholder:cbe.search',
  });
  search.addEventListener('input', () => { searchQ = search.value.trim().toLowerCase(); paintRows(); });
  card.append(search);

  const caption = el('p', { class: 'cbe-caption', 'aria-live': 'polite' });
  card.append(caption);

  const table = el('div', { class: 't-wrap', role: 'table', 'aria-label': t('cbe.title') });
  table.append(headerRow());
  const body = el('div', { class: 't-body', id: 'cbeBody' });
  table.append(body);
  card.append(table);

  root.append(card);
  container.append(root);

  const unsub = subscribe((changed) => {
    if (changed.some(k => ['usdRates', 'currencies'].includes(k))) paintRows();
  });
  paintRows();

  return () => { unsub(); root = null; };
}

function headerRow() {
  const h = el('div', { class: 't-row t-head', role: 'row' });
  for (const text of [''] .concat([t('cbe.official'), t('cbe.market'), t('cbe.diff'), t('cbe.diffPct')])) {
    h.append(el('span', { class: 't-cell', text }));
  }
  return h;
}

function paintRows() {
  const body = root?.querySelector('#cbeBody');
  if (!body || !document.contains(body)) return;
  body.replaceChildren();

  if (!cbeMap) {
    body.append(skeletonRows(6));
    load();
    return;
  }

  const codes = get('currencies').filter(code => code !== 'USD' && cbeMap[code]);
  const filtered = codes.filter(code => {
    if (!searchQ) return true;
    const c = CURRENCY_MAP.get(code);
    return `${code} ${c?.ar} ${c?.en}`.toLowerCase().includes(searchQ);
  });
  if (!filtered.length) {
    body.append(el('div', { class: 'empty-state' },
      el('span', { class: 'es-icon', text: '🏦', 'aria-hidden': 'true' }),
      el('p', { text: t('ui.noData') })));
    return;
  }

  const caption = root.querySelector('.cbe-caption');
  caption.textContent = cbeDate ? t('cbe.updatedAt', { date: iso(cbeDate) }) : '';

  for (const code of filtered) {
    const c = CURRENCY_MAP.get(code);
    const official = cbeMap[code]?.rate;
    const market = get('usdRates')[code];
    body.append(row(code, c, official, market));
  }
}

function row(code, c, official, market) {
  const row = el('div', { class: 't-row cbe-row', role: 'row' });
  const curCell = el('span', { class: 't-cell t-cur' },
    el('span', { class: 'num', text: `${flagEmoji(code)} ${code}` }),
    el('span', { class: 't-name text-dim', text: c?.ar || '' }));
  const off = Number.isFinite(official) ? iso(fmtSmart(official)) : '—';
  const mk = Number.isFinite(market) ? iso(fmtSmart(market)) : '—';

  let diff = NaN, pct = NaN;
  if (Number.isFinite(official) && Number.isFinite(market)) {
    diff = market - official;
    pct = (diff / official) * 100;
  }
  const cls = Number.isFinite(pct) ? (Math.abs(pct) < 2 ? 'ok' : Math.abs(pct) < 5 ? 'warn' : 'bad') : '';

  row.append(
    curCell,
    el('span', { class: 't-cell num' }, off),
    el('span', { class: 't-cell num' }, mk),
    el('span', { class: `t-cell num badge-diff ${cls}` },
      Number.isFinite(diff) ? `${diff >= 0 ? '+' : '−'}${iso(fmtSmart(Math.abs(diff)))}` : '—'),
    el('span', { class: `t-cell num badge-diff ${cls}` },
      Number.isFinite(pct) ? `${pct >= 0 ? '+' : '−'}${iso(Math.abs(pct).toFixed(2))}%` : '—'),
  );
  return row;
}

async function load() {
  const myTok = ++toc;
  try {
    const map = await api.getCBERates();
    if (myTok !== toc || !root) return;
    cbeMap = map;
    cbeDate = Object.values(map)[0]?.date || '';
    paintRows();
  } catch (e) {
    console.error('[cbe] فشل تحميل بيانات البنك المركزي:', e?.message || e);
    if (myTok !== toc || !root) return;
    cbeMap = null;
    paintUnavailable();
  }
}

function paintUnavailable() {
  const body = root?.querySelector('#cbeBody');
  if (!body) return;
  body.replaceChildren(el('div', { class: 'empty-state' },
    el('span', { class: 'es-icon', text: '🏦', 'aria-hidden': 'true' }),
    el('p', { text: t('cbe.unavailable') }),
    el('button', { type: 'button', class: 'btn btn-ghost rippleable', text: t('ui.retry'),
      onclick: () => { cbeMap = null; paintRows(); } })));
}

function skeletonRows(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push(el('div', { class: 't-row' },
      el('div', { class: 'skeleton', style: `height:18px;width:${60 + (i % 4) * 12}%` }),
      el('div', { class: 'skeleton', style: 'height:14px;width:16%' }),
      el('div', { class: 'skeleton', style: 'height:14px;width:16%' }),
      el('div', { class: 'skeleton', style: 'height:14px;width:14%' }),
      el('div', { class: 'skeleton', style: 'height:14px;width:14%' })));
  }
  const wrap = el('div', {});
  rows.forEach(r => wrap.append(r));
  return wrap;
}
