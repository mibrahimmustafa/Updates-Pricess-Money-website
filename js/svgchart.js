/**
 * svgchart.js — منحنى SVG مخصوص بلا مكتبات — Phase 7.1
 * polyline + area + شبكة + محاور + hover crosshair/tooltip + |anإممتك دخول
 * + تلوين صاعد/هابط + ملء الفجوات (اتصل النقاط مباشرة).
 */

import { t } from './i18n.js';
import { formatMoney } from './format.js';
import { curSymbol } from './names.js';

/**
 * يرسم المنحنى داخل container ويعيد دالة dispose.
 * @param {HTMLElement} container
 * @param {{dates:string[], values:number[]}} series
 * @param {{currency:string, decimals:number, reducedMotion:boolean}} cfg
 */
export function drawChart(container, series, cfg) {
  const { dates, values } = series;
  if (!values || values.length < 2) {
    container.innerHTML = `<div class="empty-state"><span class="es-icon">📉</span>${t('chart.noData')}</div>`;
    return () => {};
  }
  const W = 600, H = 220, PAD_L = 8, PAD_R = 8, PAD_T = 14, PAD_B = 22;
  const iw = W - PAD_L - PAD_R, ih = H - PAD_T - PAD_B;

  const min = Math.min(...values), max = Math.max(...values);
  const span = (max - min) || 1;
  const X = i => PAD_L + (iw * i) / (values.length - 1);
  const Y = v => PAD_T + ih * (1 - (v - min) / span);

  const pts = values.map((v, i) => `${X(i).toFixed(2)},${Y(v).toFixed(2)}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  const stroke = up ? 'var(--gold)' : 'var(--danger)';

  const dec = cfg.decimals ?? 2;
  const yTicks = [min, min + span / 2, max];
  const yLabels = yTicks.map((v, i) =>
    `<text class="chart-axis" x="${i === 0 ? PAD_L : W - PAD_R}" y="${i === 0 ? H - 6 : 10}" text-anchor="${i === 1 ? 'end' : 'end'}">${formatMoney(v, { decimals: dec })}</text>`).join('');
  const xLabels = [0, Math.floor((dates.length - 1) / 2), dates.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(i => `<text class="chart-axis" x="${X(i)}" y="${H - 6}" text-anchor="middle">${dates[i].slice(5)}</text>`).join('');

  container.innerHTML = `
    <div class="chart-wrap">
      <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
           aria-label="${t('chart.title')} ${cfg.currency}">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${up ? '#D4A548' : '#E5484D'}" stop-opacity=".55"/>
            <stop offset="100%" stop-color="${up ? '#D4A548' : '#E5484D'}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g class="chart-grid">
          ${[0, 0.5, 1].map(f => `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${PAD_T + ih * f}" y2="${PAD_T + ih * f}"/>`).join('')}
        </g>
        ${yLabels}${xLabels}
        <polygon class="chart-area" points="${PAD_L},${PAD_T + ih} ${pts} ${W - PAD_R},${PAD_T + ih}"/>
        <polyline class="chart-line" points="${pts}" stroke="${stroke}"/>
        <line class="chart-crosshair" x1="0" x2="0" y1="${PAD_T}" y2="${PAD_T + ih}" opacity="0"/>
        <circle class="chart-dot" r="0" cx="-10" cy="-10"/>
      </svg>
      <div class="chart-tip" role="status"><span class="tip-d"></span><span class="tip-v num" dir="ltr"></span></div>
    </div>`;

  const svg = container.querySelector('svg');
  const line = container.querySelector('.chart-line');
  const area = container.querySelector('.chart-area');
  const dot = container.querySelector('.chart-dot');
  const cross = container.querySelector('.chart-crosshair');
  const tip = container.querySelector('.chart-tip');

  /* دخول متحرك (stroke-dasharray) أو ظهور مباشر مع reduced-motion */
  let disposeAnim = () => {};
  if (!cfg.reducedMotion) {
    const len = line.getTotalLength?.() || 0;
    if (len) {
      line.style.strokeDasharray = `${len}`;
      line.style.strokeDashoffset = `${len}`;
      area.style.opacity = '0';
      requestAnimationFrame(() => {
        line.style.transition = 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)';
        line.style.strokeDashoffset = '0';
        setTimeout(() => { area.style.transition = 'opacity .5s'; area.style.opacity = '.28'; }, 500);
      });
      const tm = setTimeout(() => { line.style.strokeDasharray = ''; line.style.strokeDashoffset = ''; }, 1200);
      disposeAnim = () => clearTimeout(tm);
    }
  }

  /* hover / pointer + keyboard focus */
  function locate(clientX) {
    const rect = svg.getBoundingClientRect();
    const rx = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((rx - PAD_L) / iw) * (values.length - 1));
    return Math.max(0, Math.min(values.length - 1, idx));
  }
  function show(idx, flipY) {
    const v = values[idx];
    const cx = (X(idx) / W) * svg.getBoundingClientRect().width;
    const cyPx = (Y(v) / H) * svg.getBoundingClientRect().height;
    dot.setAttribute('cx', X(idx)); dot.setAttribute('cy', Y(v)); dot.setAttribute('r', '4');
    cross.setAttribute('x1', X(idx)); cross.setAttribute('x2', X(idx));
    cross.setAttribute('opacity', '1');
    const wrap = container.querySelector('.chart-wrap');
    const wr = wrap.getBoundingClientRect();
    tip.style.left = Math.max(52, Math.min(wr.width - 52, cx)) + 'px';
    tip.style.top = Math.max(52, cyPx - wr.top) + 'px';
    tip.querySelector('.tip-d').textContent = t('chart.on', { d: dates[idx] });
    tip.querySelector('.tip-v').textContent = `${formatMoney(v, { decimals: dec })} ${cfg.currency}`;
    tip.classList.add('show');
  }
  function hide() {
    tip.classList.remove('show');
    cross.setAttribute('opacity', '0');
    dot.setAttribute('r', '0');
  }
  svg.addEventListener('pointermove', e => show(locate(e.clientX), e.clientY));
  svg.addEventListener('pointerleave', hide);
  const kb = e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const cur = Number(svg.dataset.i || 0) + (e.key === 'ArrowLeft' ? -1 : 1);
      const idx = Math.max(0, Math.min(values.length - 1, cur));
      svg.dataset.i = idx; show(idx);
    }
  };
  svg.tabIndex = 0;
  svg.addEventListener('keydown', kb);
  svg.setAttribute('role', 'application');

  return () => { disposeAnim(); };
}
