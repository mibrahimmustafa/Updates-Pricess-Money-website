/**
 * pages/timemachine.js — آلة الزمن — Phase 7.2
 * قيمة مقارنة (افتراضياً 10 جم ذهب عيار 21) بين سنة مختارة واليوم بأي عملة ظاهرة
 * + نسبة النمو. الذهب تاريخياً: stooq. الفرنك: frankfurter (ومن دون: وضع تقريبي بشارة).
 */

import { get, subscribe } from '../store.js';
import * as api from '../api.js';
import { formatMoney } from '../format.js';
import { karatUsdPerGram, convert, sensibleDecimals } from '../money.js';
import { t } from '../i18n.js';
import * as ui from '../ui.js';
import { curName, curFlag, curSymbol, lang } from '../names.js';
import { KARATS } from '../pools.js';

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020];
const QTYS = [
  { key: 'tm.tm.gold10g21', weight: 10, karat: '21K' },
];

export function renderTimeMachine(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title">${t('tm.title')}</h1>
    <p class="text-dim" data-slot="intro" style="margin:-8px 0 0"></p>
    <div class="card" style="display:grid;gap:var(--sp-4)">
      <div class="jew-form">
        <div data-slot="year"></div>
        <div data-slot="currency"></div>
      </div>
      <div class="net-banner" data-slot="approxnote" style="display:none">
        <span aria-hidden="true">ℹ️</span>
        <span data-slot="approxtext"> </span>
      </div>
    </div>
    <div class="card">
      <div class="tm-compare" data-slot="compare">
        <div class="tm-col"><h3 data-slot="thenLabel">${t('tm.then', { y: YEARS[0] })}</h3><div class="tm-val" data-slot="thenVal">—</div></div>
        <span class="tm-arrow" aria-hidden="true">🌳</span>
        <div class="tm-col"><h3>${t('tm.now')}</h3><div class="tm-val" data-slot="nowVal">—</div></div>
      </div>
      <div style="display:grid;justify-items:center;margin-top:var(--sp-5)">
        <div class="tm-growth"><span>📈</span><span class="g-num num" dir="ltr" data-slot="growth">—</span></div>
      </div>
      <p class="empty-note" data-slot="status">${t('tm.loading')}</p>
    </div>`;

  container.append(el);
  ui.bindRipples(el);

  const slots = {
    year: el.querySelector('[data-slot=year]'),
    currency: el.querySelector('[data-slot=currency]'),
    thenVal: el.querySelector('[data-slot=thenVal]'),
    nowVal: el.querySelector('[data-slot=nowVal]'),
    growth: el.querySelector('[data-slot=growth]'),
    status: el.querySelector('[data-slot=status]'),
    intro: el.querySelector('[data-slot=intro]'),
    approxnote: el.querySelector('[data-slot=approxnote]'),
    approxtext: el.querySelector('[data-slot=approxtext]'),
    thenLabel: el.querySelector('[data-slot=thenLabel]'),
  };

  let year = YEARS[0];
  let currency = get('displayCurrency') || 'EGP';
  let token = 0;

  const qty = QTYS[0];
  slots.intro.textContent = t('tm.intro', { q: t(qty.key), y: year });

  function buildControls() {
    slots.year.replaceChildren(ui.selectEl({
      label: t('tm.year'),
      value: String(year),
      options: YEARS.map(y => ({ value: String(y), text: String(y) })),
      onchange: v => { year = Number(v); slots.thenLabel.textContent = t('tm.then', { y: year }); refresh(); },
    }));
    slots.currency.replaceChildren(ui.selectEl({
      label: t('tm.currency'),
      value: currency,
      options: (get('currencies') || []).map(c => ({ value: c, text: `${curFlag(c)} ${curName(c)}` })),
      onchange: v => { currency = v; refresh(); },
    }));
  }

  async function refresh() {
    const myToken = ++token;
    slots.status.hidden = false;
    slots.status.textContent = t('tm.loading');
    slots.thenVal.textContent = '—';
    slots.nowVal.textContent = '—';
    slots.growth.textContent = '—';

    const startISO = `${year - 1}-12-29`;
    const endISO = `${year}-01-05`; // أول أيام السنة (يغاط العطل)
    try {
      const hist = await api.fetchAssetHistory('XAU', startISO, endISO);
      if (myToken !== token) return;
      const dates = hist ? Object.keys(hist).sort() : [];
      const usdThen = hist ? hist[dates[0]] : null;
      const dateUsed = dates[0] || `${year}-01-02`;

      // اليوم: من الأسعار الحية
      const ugNow = karatUsdPerGram(qty.karat);
      const usdNow = ugNow != null ? ugNow * qty.weight : null;
      if (usdNow == null) { slots.status.textContent = t('conv.noRates'); return; }

      // سعر العملة تاريخياً: حسب فرنك (مضمون) وإلا وضع تقريبي بثبات سعر اليوم
      let rateThen = null, approx = false;
      if (currency !== 'USD') {
        const fx = await api.fetchHistory(`${year - 1}-12-30`, `${year}-01-05`, [currency]);
        if (myToken !== token) return;
        const r = fx?.rates ? Object.values(fx.rates).map(v => v[currency]).filter(Boolean) : [];
        if (r.length) rateThen = r[r.length - 1];
        else { rateThen = get('usdRates')?.[currency]; approx = true; }
      } else rateThen = 1;

      if (usdThen == null || rateThen == null) {
        slots.status.textContent = t('tm.noHistory', { y: year, d: dateUsed });
        return;
      }

      const vThen = (usdThen * qty.weight * KARATS[qty.karat]) * rateThen;
      const vNow = usdNow * convert(1, 'USD', currency);
      const growth = ((vNow / vThen - 1) * 100);

      const dec = sensibleDecimals(vThen);
      slots.thenVal.innerHTML = `${formatMoney(vThen, { decimals: dec })} <span style="font-size:14px;color:var(--text-faint)">${curSymbol(currency)}</span>`;
      slots.nowVal.innerHTML = `${formatMoney(vNow, { decimals: dec })} <span style="font-size:14px;color:var(--text-faint)">${curSymbol(currency)}</span>`;
      slots.growth.textContent = (growth >= 0 ? '+' : '') + growth.toFixed(0) + '%';
      slots.growth.parentElement.querySelector('span').textContent = growth >= 0 ? '📈' : '📉';
      slots.status.hidden = true;
      if (approx) {
        slots.approxnote.style.display = '';
        slots.approxtext.textContent = t('chart.approx');
      } else slots.approxnote.style.display = 'none';
    } catch {
      if (myToken === token) slots.status.textContent = t('tm.error');
    }
  }

  buildControls();
  refresh();

  const unsub = subscribe(changed => {
    if (changed.some(c => ['currencies', 'displayCurrency', 'prices', 'usdRates'].includes(c))) {
      buildControls();
      refresh();
    }
  });
  return () => unsub();
}
