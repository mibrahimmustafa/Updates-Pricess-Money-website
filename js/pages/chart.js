/**
 * pages/chart.js — المخططات — Phase 7.1
 * الأصل × عملة العرض × فترة (1W..MAX). بيانات المعدن: stooq.
 * عملة تاريخية مدعومة → منحنى كامل. غير مدعومة → وضع الدولار + شارة توضيح.
 */

import { get, subscribe } from '../store.js';
import * as api from '../api.js';
import { t } from '../i18n.js';
import * as ui from '../ui.js';
import { drawChart } from '../svgchart.js';
import { sensibleDecimals } from '../money.js';
import { assetName, assetIcon, curName, curFlag, lang } from '../names.js';

const PERIODS = { '1w': 7, '1m': 31, '3m': 92, '6m': 183, '1y': 365, max: 4000 };
const AR_PERIODS = { '1w': 'chart.p1w', '1m': 'chart.p1m', '3m': 'chart.p3m', '6m': 'chart.p6m', '1y': 'chart.p1y', max: 'chart.pmax' };

function isoAdd(days) { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); }

export function renderChart(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title">${t('chart.title')}</h1>
    <div class="card" style="display:grid;gap:var(--sp-4)">
      <div class="jew-form">
        <div data-slot="asset"></div>
        <div data-slot="currency"></div>
      </div>
      <div data-slot="period"></div>
      <div class="net-banner" data-slot="fxnote" style="display:none">
        <span aria-hidden="true">ℹ️</span><span>${t('chart.approx')}</span>
      </div>
    </div>
    <div class="card" data-slot="chart">
      <p class="empty-note" data-slot="status">${t('chart.loading')}</p>
    </div>`;

  container.append(el);
  ui.bindRipples(el);

  const assetSlot = el.querySelector('[data-slot=asset]');
  const curSlot = el.querySelector('[data-slot=currency]');
  const periodSlot = el.querySelector('[data-slot=period]');
  const chartCard = el.querySelector('[data-slot=chart]');
  const status = el.querySelector('[data-slot=status]');
  const fxnote = el.querySelector('[data-slot=fxnote]');

  let asset = (get('metals') || [])[0] || 'XAU';
  let currency = get('displayCurrency') || 'EGP';
  let period = '1m';
  let disposeDraw = null;
  let token = 0; // إبطال الطلبات المتداخلة

  function buildControls() {
    assetSlot.replaceChildren(ui.selectEl({
      label: t('chart.asset'),
      value: asset,
      options: (get('metals') || []).map(m => ({ value: m, text: `${assetIcon(m)} ${assetName(m)}` })),
      onchange: v => { asset = v; refresh(); },
    }));
    curSlot.replaceChildren(ui.selectEl({
      label: t('chart.currency'),
      value: currency,
      options: [{ value: 'USD', text: '🇺🇸 USD' }].concat((get('currencies') || []).map(c => ({ value: c, text: `${curFlag(c)} ${curName(c)}` }))),
      onchange: v => { currency = v; refresh(); },
    }));
  }

  function buildPeriods() {
    periodSlot.replaceChildren(ui.segmented({
      value: period,
      options: Object.keys(PERIODS).map(k => ({ value: k, text: t(AR_PERIODS[k]) })),
      onChange: v => { period = v; refresh(); },
    }));
  }

  async function refresh() {
    const myToken = ++token;
    status.hidden = false;
    chartCard.querySelectorAll('.chart-wrap, .empty-state').forEach(n => n.remove());

    const days = PERIODS[period];
    const end = isoAdd(0);
    const start = isoAdd(days);

    // 1) تاريخ المعدن بالدولار (stooq) — بفشل: وضع تقريبي بالتحرك اليومي فقط
    let series = null;
    try {
      const hist = await api.fetchAssetHistory(asset, start, end);
      if (hist) {
        let fx = null;
        let fxOk = false;
        if (currency !== 'USD') {
          fx = await api.fetchHistory(start, end, [currency]);
          fxOk = !!(fx && fx.rates && Object.keys(fx.rates).length);
        } else fxOk = true;

        const dates = Object.keys(hist).sort();
        let values;
        if (currency !== 'USD' && fxOk) {
          const rr = fx.rates;
          const lastRate = rr[Object.keys(rr).sort().pop()]?.[currency];
          values = dates.map(d => {
            const r = rr[d]?.[currency] ?? lastRate;
            return r != null ? hist[d] * r : null;
          }).filter(v => v != null);
        } else if (currency !== 'USD' && !fxOk) {
          // وضع تقريبي: سعر اليوم ثابت للعملة + شارة
          const r = get('usdRates')?.[currency];
          values = dates.map(d => r != null ? hist[d] * r : null).filter(v => v != null);
          fxnote.style.display = '';
        } else {
          values = dates.map(d => hist[d]);
        }
        series = { dates: dates.slice(-values.length), values };
        if (fxOk) fxnote.style.display = 'none';
      }
    } catch { /* أسفل */ }

    if (myToken !== token) return; // Elizabeth تغيّرت الفترة أثناء الانتظار
    status.hidden = true;

    if (!series) {
      chartCard.querySelectorAll('.chart-wrap, .empty-state').forEach(n => n.remove());
      chartCard.insertAdjacentHTML('beforeend', `<div class="empty-state"><span class="es-icon">🕰️</span>${t('chart.noData')}</div>`);
      return;
    }

    const dec = sensibleDecimals(series.values[series.values.length - 1]);
    if (disposeDraw) disposeDraw();
    disposeDraw = drawChart(chartCard, series, { currency, decimals: dec, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
  }

  buildControls();
  buildPeriods();
  refresh();

  const unsub = subscribe(changed => {
    if (changed.some(c => ['metals', 'currencies', 'displayCurrency'].includes(c))) {
      buildControls();
      // هَجَرة الخيارات الفاقدة
      if (!(get('metals') || []).includes(asset)) asset = (get('metals') || [])[0] || asset;
      if (currency !== 'USD' && !(get('currencies') || []).includes(currency)) currency = get('displayCurrency') || 'USD';
      refresh();
    }
  });
  return () => { unsub(); if (disposeDraw) disposeDraw(); };
}
