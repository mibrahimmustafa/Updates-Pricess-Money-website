/**
 * pages/cbe.js — أسعار البنك المركزي المصري — Phase 8
 * جدول: السعر الرسمي CBE مقابل السوق الحي + الفرق والفرق النسبي مع تلوين.
 */

import { get, set, subscribe } from '../store.js';
import * as api from '../api.js';
import { formatMoney, timeAgo } from '../format.js';
import { sensibleDecimals } from '../money.js';
import { t } from '../i18n.js';
import * as ui from '../ui.js';
import { curName, curFlag, lang } from '../names.js';

const GAP_TONES = { near: 'diff-near', far: 'diff-far', very: 'diff-very' };

export function renderCBE(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title">${t('cbe.title')}</h1>
    <p class="text-dim" style="margin:-8px 0 0">${t('cbe.subtitle')}</p>
    <div data-slot="banner"></div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        <h2 class="section-title">CBE</h2>
        <span class="text-dim num" style="font-size:12px" data-slot="updated"></span>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t('cbe.table.currency')}</th>
              <th style="text-align:end">${t('cbe.table.cbe')}</th>
              <th style="text-align:end">${t('cbe.table.mkt')}</th>
              <th style="text-align:end">${t('cbe.table.diff')}</th>
              <th style="text-align:end">${t('cbe.table.pct')}</th>
            </tr>
          </thead>
          <tbody data-slot="rows"></tbody>
        </table>
      </div>
      <p class="empty-note" data-slot="wait">${t('cbe.waiting')}</p>
    </div>`;

  container.append(el);
  ui.bindRipples(el);

  const rowsSlot = el.querySelector('[data-slot=rows]');
  const updatedSlot = el.querySelector('[data-slot=updated]');
  const waitSlot = el.querySelector('[data-slot=wait]');
  const bannerSlot = el.querySelector('[data-slot=banner]');

  function paint() {
    const cbe = get('cbeRates');
    const rates = get('usdRates') || {};
    updatedSlot.textContent = get('lastUpdate') ? timeAgo(get('lastUpdate')) : '';

    if (!cbe || !Object.keys(cbe).length) {
      rowsSlot.innerHTML = `<tr><td colspan="5" class="empty-note">${t('cbe.none')}</td></tr>`;
      return;
    }
    waitSlot.hidden = Object.keys(rates).length > 0;

    const codes = Object.keys(cbe).filter(c => c !== 'USD');
    rowsSlot.innerHTML = codes.map(code => {
      const off = Number(cbe[code]);
      const mkt = rates[code];
      if (!Number.isFinite(off)) return '';
      const diff = mkt != null ? mkt - off : null;
      const pct = diff != null && off ? (diff / off) * 100 : null;
      const apct = pct == null ? null : Math.abs(pct);
      const tone = apct == null ? '' : apct < 2 ? 'near' : apct < 10 ? 'far' : 'very';
      const label = tone === 'near' ? t('cbe.near') : tone === 'far' ? t('cbe.far') : t('cbe.veryFar');
      return `
        <tr title="${curName(code)} · ${label}">
          <td><span class="fx-flag-small">${curFlag(code)}</span> ${curName(code)} <span class="num text-dim" dir="ltr">${code}</span></td>
          <td class="num-cell" dir="ltr">${formatMoney(off, { decimals: sensibleDecimals(off) })}</td>
          <td class="num-cell" dir="ltr">${mkt != null ? formatMoney(mkt, { decimals: sensibleDecimals(mkt) }) : '—'}</td>
          <td class="num-cell ${tone ? GAP_TONES[tone] : ''}" dir="ltr">${diff == null ? '—' : (diff >= 0 ? '+' : '') + formatMoney(diff, { decimals: sensibleDecimals(diff) })}</td>
          <td class="num-cell ${tone ? GAP_TONES[tone] : ''}" dir="ltr">${pct == null ? '—' : (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</td>
        </tr>`;
    }).join('');
  }

  /* جلب رسمي فوري عند الفتح + تحديث store مباشرة */
  import("./../polling.js").then(() => { /* الدورة تشتغل من main */ });
  api.fetchCBERates().then(r => { if (r) set({ cbeRates: r }); });

  const unsub = subscribe(changed => {
    if (changed.some(c => ['cbeRates', 'usdRates', 'prices', 'lastUpdate'].includes(c))) paint();
  });
  paint();
  return () => unsub();
}
