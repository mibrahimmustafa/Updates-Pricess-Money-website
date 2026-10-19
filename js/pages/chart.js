/**
 * pages/chart.js — المخططات التاريخية — Phase 7 (SVG vanilla — بلا مكتبات)
 * الأصل × عملة العرض × فترة (1W/1M/3M/6M/1Y/MAX).
 *  - العملات: تاريخ حقيقي من Frankfurter (v1 range).
 *  - المعادن: سجل محلي يتجمّع من استخدام التطبيق (history.js) — بديل مصدر تاريخي غائب.
 * تداخلات: hover tooltip + تنقل كيبورد + أنيميشن دخول + ملء فجوات العطل.
 */

import { get, subscribe } from '../store.js';
import { ASSET_MAP, CURRENCY_MAP, flagEmoji } from '../pools.js';
import * as api from '../api.js';
import { localCombined } from '../history.js';
import { fmtSmart, iso, utcDate } from '../format.js';
import { t } from '../i18n.js';
import { el, toast } from '../ui.js';
import { refresh } from '../polling.js';

const PERIODS = { '1W': 7, '1M': 30, '3M': 90, '6M': 182, '1Y': 365, 'MAX': 0 };

let ctrl = { asset: 'XAU', cur: null, period: '1M' };
let root = null;
let busyTok = 0;

export function renderChart(container) {
  ctrl.cur = get('displayCurrency');
  ctrl.asset = get('metals')[0] || 'XAU';
  root = el('section', { class: 'page chart' });

  // ====== التحكم ======
  const card = el('div', { class: 'card ch-card' });
  card.append(el('h1', { class: 'page-title', text: t('ch.title') }));

  const assetSel = el('select', { class: 'select rippleable', 'aria-label': t('ch.asset') });
  for (const code of get('metals')) assetSel.append(el('option', { value: code, text: assetLabel(code) }));
  assetSel.value = ctrl.asset;

  const curSel = el('select', { class: 'select rippleable', 'aria-label': t('ch.currency') });
  for (const code of get('currencies')) curSel.append(el('option', { value: code, text: `${flagEmoji(code)} ${code}` }));
  curSel.value = ctrl.cur;

  assetSel.addEventListener('change', () => { ctrl.asset = assetSel.value; load(); });
  curSel.addEventListener('change', () => { ctrl.cur = curSel.value; load(); });

  const per = el('div', { class: 'segmented ch-period', role: 'group', 'aria-label': t('ch.period') });
  for (const p of Object.keys(PERIODS)) {
    per.append(el('button', {
      type: 'button', class: `seg-btn rippleable${p === ctrl.period ? ' active' : ''}`, dataset: { p },
      onclick: (e) => {
        ctrl.period = p;
        per.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === e.currentTarget));
        load();
      },
    }, el('span', { text: t('per.' + p) })));
  }

  card.append(
    el('div', { class: 'two-col' }, field(t('ch.asset'), assetSel), field(t('ch.currency'), curSel)),
    field(t('ch.period'), per),
  );

  // ====== منطقة الرسم ======
  const plot = el('div', { class: 'card chart-wrap' });
  plot.append(el('div', { class: 'chart-stats', id: 'chStats' }));
  const svgBox = el('div', { class: 'svg-box', id: 'chSvgBox' });
  plot.append(svgBox);
  const tip = el('div', { class: 'chart-tip num', hidden: true });
  plot.append(tip);
  plot.append(el('p', { class: 'hint', text: t('ch.localNote') }));

  root.append(card, plot);
  container.append(root);

  function load() {
    const tok = ++busyTok;
    svgBox.replaceChildren(skeletonSVG());
    loadSeries().then(points => {
      if (tok !== busyTok || !document.contains(root)) return;
      draw(points, svgBox, tip);
    }).catch(() => {
      if (tok !== busyTok || !document.contains(root)) return;
      svgBox.replaceChildren(emptyState(t('ch.nodata'), t('ch.nodataHint')));
    });
  }

  load();
  const unsub = subscribe((changed) => {
    if (changed.some(k => ['prices', 'usdRates', 'currencies', 'metals'].includes(k))) {
      // المنحنى المحلي قد يتقدم نقطة جديدة كل 5 دقائق — أرسم أعيد
      if (document.hidden) return;
      load();
    }
  });
  return () => { unsub(); root = null; busyTok++; };
}

/** بناء السلسلة حسب نوع الأصل */
async function loadSeries() {
  const { asset, cur, period } = ctrl;
  const days = PERIODS[period];
  const end = new Date();
  const start = new Date(Date.now() - (days || 365 * 30) * 864e5);

  if (ASSET_MAP.has(asset)) {
    // معدن → سجل محلي (سعر الجرم × سعر الصرف التاريخي المخزون مع كل نقطة)
    return filterPeriod(localCombined(asset, cur), days);
  }
  // عملة → تاريخ Frankfurter الحقيقي؛ إن غاب التاريخ لهذه العملة (EGP/الخليج) → سجل محلي
  try {
    const startISO = utcDate(start.getFullYear(), start.getMonth() + 1, start.getDate());
    const endISO = utcDate(end.getFullYear(), end.getMonth() + 1, end.getDate());
    const hist = await api.getHistory(startISO, endISO, [asset, cur]);
    const pts = [];
    for (const row of hist) {
      const a = row.values?.[asset];
      const c = row.values?.[cur];
      if (!Number.isFinite(Number(a)) || !Number.isFinite(Number(c))) continue;
      pts.push({ t: new Date(row.date + 'T00:00:00Z').getTime(), v: (Number(c) / Number(a)) });
    }
    if (pts.length >= 3) return filterPeriod(pts, days);
    throw new Error('no history for this pair');
  } catch {
    const local = filterPeriod(localCombined(asset, cur), days);
    if (local.length >= 3) return local;
    throw new Error('nodata');
  }
}

function filterPeriod(pts, days) {
  if (days > 0) {
    const cutoff = Date.now() - days * 864e5;
    return pts.filter(p => p.t >= cutoff);
  }
  return pts;
}

/** الرسم الفعلي */
function draw(points, svgBox, tip) {
  if (!points || points.length < 3) {
    svgBox.replaceChildren(emptyState(t('ch.nodata'), t('ch.nodataHint')));
    drawStats(null, svgBox.parentElement);
    return;
  }
  const sampled = sample(points, 90);
  const W = 640, H = 300, padL = 58, padR = 14, padT = 16, padB = 34;
  const iw = W - padL - padR, ih = H - padT - padB;
  const vals = sampled.map(p => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || (max * 0.02) || 1;
  min -= span * 0.08; max += span * 0.08;
  const x = i => padL + (iw * i) / (sampled.length - 1);
  const y = v => padT + ih - ((v - min) / (max - min)) * ih;

  let d = '';
  sampled.forEach((p, i) => { d += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1) + ' '; });
  const areaD = d + `L ${x(sampled.length - 1).toFixed(1)} ${padT + ih} L ${padL} ${padT + ih} Z`;

  const first = sampled[0], last = sampled[sampled.length - 1];
  const change = ((last.v - first.v) / first.v) * 100;
  const up = change >= 0;
  const lineColor = up ? 'var(--success)' : 'var(--danger)';

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chart-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', chartAria(sampled, change));

  // defs: gradient
  const defs = document.createElementNS(ns, 'defs');
  defs.innerHTML = `
    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${up ? '#35C482' : '#E5484D'}" stop-opacity=".28"/>
      <stop offset="1" stop-color="${up ? '#35C482' : '#E5484D'}" stop-opacity="0"/>
    </linearGradient>`;
  svg.append(defs);

  // شبكة + قيم y
  const gridN = 4;
  for (let i = 0; i <= gridN; i++) {
    const yy = padT + (ih * i) / gridN;
    const v = max - ((max - min) * i) / gridN;
    svg.appendChild(line(padL, yy, W - padR, yy, 'var(--border)'));
    const lbl = document.createElementNS(ns, 'text');
    lbl.setAttribute('x', padL - 6); lbl.setAttribute('y', yy + 4);
    lbl.setAttribute('text-anchor', 'end'); lbl.setAttribute('class', 'ch-tick num');
    lbl.textContent = fmtSmart(v);
    svg.append(lbl);
  }
  // تسميات التاريخ x — لو التغطية داخل يوم واحد نجيب HH:MM (وإلا MM/DD)
  const spanMs = sampled[sampled.length - 1].t - sampled[0].t;
  const labelFor = spanMs < 36 * 3600e3 ? shortTime : shortDate;
  const idxs = [0, Math.floor((sampled.length - 1) / 3), Math.floor(((sampled.length - 1) * 2) / 3), sampled.length - 1];
  [...new Set(idxs)].forEach(i => {
    const lbl = document.createElementNS(ns, 'text');
    lbl.setAttribute('x', x(i)); lbl.setAttribute('y', H - 10);
    lbl.setAttribute('text-anchor', i === 0 ? 'start' : i === sampled.length - 1 ? 'end' : 'middle');
    lbl.setAttribute('class', 'ch-tick num');
    lbl.textContent = labelFor(sampled[i].t);
    svg.append(lbl);
  });

  // مساحت + خط
  const area = document.createElementNS(ns, 'path');
  area.setAttribute('d', areaD); area.setAttribute('fill', 'url(#cg)'); area.setAttribute('class', 'ch-area');
  svg.append(area);

  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d); path.setAttribute('fill', 'none');
  path.setAttribute('stroke', lineColor); path.setAttribute('stroke-width', '2.4');
  path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  // أنيميشن دخول (stroke-dashoffset)
  try {
    const len = path.getTotalLength?.() || 0;
    if (len && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      requestAnimationFrame(() => {
        path.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)';
        path.style.strokeDashoffset = '0';
        setTimeout(() => { path.style.strokeDasharray = ''; }, 1300);
      });
    }
  } catch { /* لا بأس بلا أنيميشن */ }

  // نقطة الأخيرة نابضة
  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', x(sampled.length - 1)); dot.setAttribute('cy', y(last.v));
  dot.setAttribute('r', '4.5'); dot.setAttribute('fill', lineColor);
  dot.setAttribute('class', 'ch-dot-last');
  svg.append(dot);

  // المنطقة التفاعلية + خط المؤشر + نقطة hover
  const guide = document.createElementNS(ns, 'line');
  guide.setAttribute('class', 'ch-guide'); guide.setAttribute('y1', padT); guide.setAttribute('y2', padT + ih);
  guide.setAttribute('stroke', 'var(--border-strong)'); guide.setAttribute('stroke-dasharray', '4 4');
  guide.style.opacity = '0';
  const hDot = document.createElementNS(ns, 'circle');
  hDot.setAttribute('r', '4'); hDot.setAttribute('fill', lineColor); hDot.style.opacity = '0';
  svg.append(guide, hDot);

  const overlay = document.createElementNS(ns, 'rect');
  overlay.setAttribute('x', padL); overlay.setAttribute('y', padT);
  overlay.setAttribute('width', iw); overlay.setAttribute('height', ih);
  overlay.setAttribute('fill', 'transparent');
  overlay.style.cursor = 'crosshair';
  overlay.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = clampI(Math.round(((px - padL) / iw) * (sampled.length - 1)), 0, sampled.length - 1);
    showTip(i);
  });
  overlay.addEventListener('pointerleave', () => { tip.hidden = true; guide.style.opacity = '0'; hDot.style.opacity = '0'; });

  // كيبورد: نقاط قابلة للتركيز (مأخوذة 12 نقطة موزعة)
  const kbIdx = [...new Set(Array.from({ length: Math.min(12, sampled.length) }, (_, j) =>
    Math.round((j * (sampled.length - 1)) / (Math.min(12, sampled.length) - 1))))];
  kbIdx.forEach(i => {
    const kb = document.createElementNS(ns, 'circle');
    kb.setAttribute('cx', x(i)); kb.setAttribute('cy', y(sampled[i].v));
    kb.setAttribute('r', '12'); kb.setAttribute('fill', 'transparent');
    kb.setAttribute('tabindex', '0');
    kb.setAttribute('role', 'img'); kb.setAttribute('aria-label', tipText(i));
    kb.addEventListener('focus', () => showTip(i));
    kb.addEventListener('blur', () => { tip.hidden = true; guide.style.opacity = '0'; hDot.style.opacity = '0'; });
    svg.append(kb);
  });

  svg.append(overlay);
  svgBox.replaceChildren(svg);

  function showTip(i) {
    const p = sampled[i];
    guide.setAttribute('x1', x(i)); guide.setAttribute('x2', x(i));
    guide.style.opacity = '1';
    hDot.setAttribute('cx', x(i)); hDot.setAttribute('cy', y(p.v));
    hDot.style.opacity = '1';
    tip.hidden = false;
    tip.innerHTML = `${iso(labelFor(p.t))} · ${iso(fmtSmart(p.v))}`;
    // موقع التلميح نسبةً إلى الحاوية
    const boxRect = svgBox.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const sx = svgRect.left - boxRect.left + (x(i) / W) * svgRect.width;
    tip.style.left = Math.max(4, Math.min(boxRect.width - tip.offsetWidth - 4, sx - tip.offsetWidth / 2)) + 'px';
    tip.style.top = '6px';
  }
  function tipText(i) {
    const p = sampled[i];
    return `${labelFor(p.t)} — ${fmtSmart(p.v)} ${ctrl.cur}`;
  }
  function chartAria(pts, ch) {
    const a = ASSET_MAP.get(ctrl.asset) || { en: ctrl.asset, ar: ctrl.asset };
    return `${a.en} / ${ctrl.cur} — ${pts.length} points — ${t('ch.change')} ${ch.toFixed(1)}%`;
  }

  drawStats({ sampled, change, up }, svgBox.parentElement);
}

/** شرائح الإحصاء أعلى الرسم */
function drawStats(data, plotBox) {
  const box = plotBox?.querySelector('.chart-stats');
  if (!box) return;
  box.replaceChildren();
  if (!data) return;
  const { change, up, sampled } = data;
  const vals = sampled.map(p => p.v);
  const sym = CURRENCY_MAP.get(ctrl.cur)?.symbol || ctrl.cur;
  // شريحة شفافية: التغطية الزمنية الفعلية مقابل الفترة المطلوبة (المعادن تبني سجلها محلياً تدريجياً)
  const spanMs = sampled[sampled.length - 1].t - sampled[0].t;
  box.append(
    el('span', { class: `stat-chip num ${up ? 'up' : 'down'}` },
      el('span', { text: t('ch.change'), 'data-i18n': 'ch.change' }), el('span', { text: ` ${up ? '▲ +' : '▼ '}${iso(change.toFixed(2))}%` })),
    el('span', { class: 'stat-chip num' }, el('span', { text: t('ch.high') + ':' }),
      document.createTextNode(` ${iso(fmtSmart(Math.max(...vals)))} ${sym}`)),
    el('span', { class: 'stat-chip num' }, el('span', { text: t('ch.low') + ':' }),
      document.createTextNode(` ${iso(fmtSmart(Math.min(...vals)))} ${sym}`)),
    el('span', { class: 'stat-chip num stat-dim' }, `⏱ ${t('ch.span')}: ${fmtSpan(spanMs)}`),
    el('span', { class: 'stat-chip num' }, `(${sampled.length} ${t('ch.points')})`),
  );
}

/* ---------- مساعدات ---------- */
function sample(pts, max) {
  if (pts.length <= max) return pts;
  const out = [];
  const stepN = (pts.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(pts[Math.round(i * stepN)]);
  return out;
}
function shortDate(t) {
  const d = new Date(t);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}${d.getMonth() === 0 ? '/' + String(d.getFullYear()).slice(2) : ''}`;
}
/** تسمية زمنية (ساعة:دقيقة) — لما كل التغطية داخل يوم واحد بدل ما تتكرر 10/19 ×4 */
function shortTime(t) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
/** مدة مفهومة: دقائق/ساعات/أيام حسب الحجم */
function fmtSpan(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 90) return `${m} ${t('ch.spanM')}`;
  const h = ms / 3600e3;
  if (h < 48) return `${Math.round(h * 10) / 10} ${t('ch.spanH')}`;
  return `${Math.round((h / 24) * 10) / 10} ${t('ch.spanD')}`;
}
function clampI(v, a, b) { return Math.min(b, Math.max(a, v)); }
function line(x1, y1, x2, y2, stroke) {
  const ns = 'http://www.w3.org/2000/svg';
  const l = document.createElementNS(ns, 'line');
  l.setAttribute('x1', x1); l.setAttribute('y1', y1);
  l.setAttribute('x2', x2); l.setAttribute('y2', y2);
  l.setAttribute('stroke', stroke);
  return l;
}
function skeletonSVG() {
  return el('div', { class: 'skeletons' },
    el('div', { class: 'skeleton', style: 'height:220px;border-radius:12px' }));
}
function emptyState(title, hint) {
  return el('div', { class: 'empty-state' },
    el('span', { class: 'es-icon', text: '📈', 'aria-hidden': 'true' }),
    el('p', { text: title }),
    el('p', { class: 'hint', text: hint }));
}
function assetLabel(code) {
  const a = ASSET_MAP.get(code);
  return a ? `${a.icon} ${get('lang') === 'ar' ? a.ar : a.en} (${code})` : code;
}
function field(labelText, control) {
  return el('label', { class: 'field' }, el('span', { class: 'label', text: labelText }), control);
}
