/**
 * pages/home.js — الرئيسية (قلب التطبيق) — Phase 3
 * شريط الفوركس (tiles LTR داخل RTL) + بطاقة لكل معدن ظاهر (أونصة + جدول جرام + عيارات الذهب)
 * + شارة مباشر + chip استجابة + skeleton + بانر أوفلاين + نسخ بنقرة + count-up.
 */

import { get, subscribe } from '../store.js';
import { ASSET_MAP, CURRENCY_MAP, flagEmoji, pricePerGramUSD, TROY_OZ_GRAMS, LB_GRAMS, KARATS } from '../pools.js';
import { convert } from '../money.js';
import { formatMoney, money, iso, timeAgo, fmtSmart, LRI, PDI } from '../format.js';
import { t } from '../i18n.js';
import { refresh } from '../polling.js';
import { countUp, flash, copyText, toast } from '../ui.js';
import { snapshotAge } from '../cache.js';

let builtSig = '';
let valueEls = new Map();   // vid → {el, dec} تحديث موضعي بلا إعادة بناء
let rootEl = null;

export function renderHome(container) {
  rootEl = document.createElement('section');
  rootEl.className = 'page home';
  rootEl.innerHTML = `
    <header class="home-head">
      <div class="home-head-text">
        <h1 class="page-title" data-i18n="home.title"></h1>
        <div class="home-status" dir="ltr">
          <span class="live-badge" id="liveBadge"><span class="dot" aria-hidden="true"></span><span data-i18n="ui.live"></span></span>
          <span class="latency-chip" id="latencyChip" data-vid="__lat"></span>
        </div>
      </div>
      <button class="btn btn-ghost rippleable" id="refreshBtn" aria-label="${t('ui.refresh')}" data-i18n-attr="aria-label:ui.refresh">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>
        <span data-i18n="ui.refresh"></span>
      </button>
    </header>

    <div class="net-banner" id="netBanner" role="alert" hidden>
      <span aria-hidden="true">📡</span><span id="netText">${t('ui.offline')}</span>
      <button class="btn btn-sm rippleable" id="bannerRetry">${t('ui.retry')}</button>
    </div>

    <section aria-label="${t('home.fxTitle')}" data-i18n-attr="aria-label:home.fxTitle">
      <h2 class="sec-title" data-i18n="home.fxTitle"></h2>
      <div class="fx-strip" id="fxStrip" role="list"></div>
    </section>

    <section aria-label="${t('home.assetsTitle')}" data-i18n-attr="aria-label:home.assetsTitle">
      <div class="sec-title-row">
        <h2 class="sec-title" data-i18n="home.assetsTitle"></h2>
        <span class="hint">${t('home.tapToCopy')}</span>
      </div>
      <div class="assets" id="assetsGrid" aria-live="off"></div>
    </section>

    <p class="last-update" id="lastUpdate" aria-live="polite"></p>
  `;
  container.append(rootEl);
  valueEls = buildStructure(rootEl);

  rootEl.querySelector('#refreshBtn').addEventListener('click', () => {
    refresh(); toast(t('ui.loading'), { kind: 'gold', ms: 1800 });
  });
  rootEl.querySelector('#bannerRetry').addEventListener('click', () => refresh());

  const paint = () => paintAll(rootEl, valueEls);
  paint();
  const unsub = subscribe(paint);
  return () => { unsub(); rootEl = null; valueEls = new Map(); };
}

/* ============ البناء الهيكلي (يتغير فقط عند تغيّر قوائم العرض) ============ */
function sigOf() {
  return JSON.stringify([get('currencies'), get('metals')]);
}

function skeletonHTML() {
  return `
    <div class="fx-strip"><div class="skeleton fx-tile"></div><div class="skeleton fx-tile"></div><div class="skeleton fx-tile"></div><div class="skeleton fx-tile"></div></div>
    <div class="assets">
      ${'<div class="card metal-card skeleton-card"></div>'.repeat(3)}
    </div>`;
}

function buildStructure(root) {
  const sig = sigOf();
  if (sig === builtSig) return valueEls;
  builtSig = sig;

  const strip = root.querySelector('#fxStrip');
  const grid = root.querySelector('#assetsGrid');
  strip.replaceChildren(); grid.replaceChildren();
  const els = new Map();

  // ---- شريط الفوركس (بدون USD لأنه الأساس) — كل tile داخله dir=ltr مفروض
  for (const code of get('currencies')) {
    if (code === 'USD') continue;
    const c = CURRENCY_MAP.get(code);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'fx-tile rippleable';
    tile.setAttribute('role', 'listitem');
    tile.dataset.cur = code;
    tile.setAttribute('aria-label', `1 USD to ${code}`);
    tile.innerHTML = `
      <span class="fx-line" dir="ltr">
        <span class="fx-from num">1 USD</span>
        <span class="fx-arrow" aria-hidden="true">→</span>
        <span class="fx-to num">${flagEmoji(code)} ${code}</span>
      </span>
      <span class="fx-value num" data-vid="fx:${code}">—</span>`;
    tile.addEventListener('click', () => {
      try { sessionStorage.setItem('conv_prefill', JSON.stringify({ from: 'USD', to: code, amount: 1 })); } catch {}
      location.hash = '#/converter';
    });
    strip.append(tile);
    els.set(`fx:${code}`, { el: tile.querySelector('.fx-value'), dec: 2 });
  }

  // ---- بطاقات الأصول الظاهرة
  for (const code of get('metals')) {
    const a = ASSET_MAP.get(code);
    if (!a) continue;
    const card = document.createElement('article');
    card.className = 'card metal-card';
    card.dataset.asset = code;
    card.style.setProperty('--mc', a.color);

    const unitLabel = code === 'HG' ? 'ui.usdPerLb' : a.unit === 'coin' ? 'ui.usdPerCoin' : 'ui.usdPerOz';
    card.innerHTML = `
      <header class="mc-head">
        <span class="mc-icon" aria-hidden="true">${a.icon}</span>
        <div class="mc-name">
          <h3>${a.ar} <small class="num">${code}</small></h3>
        </div>
        <div class="mc-oz">
          <span class="mc-oz-val num" data-vid="oz:${code}">—</span>
          <small data-i18n="${unitLabel}"></small>
        </div>
      </header>
      <div class="gram-table" role="table" aria-label="${code}"></div>
      ${code === 'XAU' ? `
      <div class="karat-box">
        <div class="kb-head" data-i18n="home.karatBreakdown"></div>
        <div class="kb-row k-head"><span data-i18n="jw.karat"></span><span data-i18n="ui.perGram"></span></div>
        <div class="kb-body"></div>
        <p class="hint">${t('home.karatNote')}</p>
      </div>` : ''}`;

    // صفوف الجرم/الوحدة لكل عملة ظاهرة
    const table = card.querySelector('.gram-table');
    const perGram = a.unit !== 'coin' && code !== 'HG';
    const rowLabel = perGram ? 'ui.perGram' : 'ui.perCoin';
    for (const cur of get('currencies')) {
      const cc = CURRENCY_MAP.get(cur);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'g-row';
      row.setAttribute('role', 'row');
      row.setAttribute('aria-label', `${a.en} ${t(rowLabel)} ${formatMoney(0)} ${cc.symbol} — ${t('ui.copied')}`);
      row.innerHTML = `
        <span class="g-cur num">${flagEmoji(cur)} ${cur}</span>
        <span class="g-name text-dim">${cc.ar}</span>
        <span class="g-val num" data-vid="${rowKey(code, cur)}">—</span>`;
      row.addEventListener('click', () => {
        const v = row.querySelector('.g-val')?.dataset.copiedVal || '';
        if (v) copyText(v, `${t('ui.copied')} — ${cur}`);
      });
      table.append(row);
      els.set(rowKey(code, cur), {
        el: row.querySelector('.g-val'),
        dec: 2,
        compute: () => computeAsset(code, cur, perGram),
      });
    }

    // عيارات الذهب (عرض فقط — بالعملة الافتراضية)
    if (code === 'XAU') {
      const body = card.querySelector('.kb-body');
      for (const [k, purity] of Object.entries(KARATS)) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'kb-row g-row';
        row.innerHTML = `
          <span class="k-badge">${k} <small class="num">${iso(purity)}</small></span>
          <span class="g-val num" data-vid="k:${k}">—</span>`;
        row.addEventListener('click', () => {
          const v = row.querySelector('.g-val')?.dataset.copiedVal || '';
          if (v) copyText(v, t('ui.copied'));
        });
        body.append(row);
        els.set(`k:${k}`, { el: row.querySelector('.g-val'), dec: 2, compute: () => computeKarat(purity) });
      }
    }

    grid.append(card);
    els.set(`oz:${code}`, {
      el: card.querySelector(`[data-vid="oz:${code}"]`),
      dec: 2,
      compute: () => get('prices')[code]?.usd ?? NaN,
      flashable: true,
    });
  }
  return els;
}

function rowKey(code, cur) { return `g:${code}:${cur}`; }

/** سعر المعدن بالعملة (جرام أو وحدة أصلي) */
function computeAsset(code, cur, perGram) {
  const p = get('prices')[code]?.usd;
  let v;
  if (perGram) {
    const g = pricePerGramUSD(code, p);
    v = convert(g || NaN, 'USD', cur);
  } else {
    v = p ? convert(NaN2(p), 'USD', cur) : NaN; // عملة رقمية/نحاس: سعر الوحدة الأم مثل ما هو
  }
  return v;
}
function NaN2(x) { return Number.isFinite(x) ? x : NaN; }

function computeKarat(purity) {
  const cur = get('displayCurrency');
  const g = pricePerGramUSD('XAU', get('prices').XAU?.usd);
  return convert(g * purity, 'USD', cur);
}

/* ============ التحديث الموضعي (كل دورة أو تغيير حالة) ============ */
let rafPending = false;
function paintAll(root, els) {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    if (!rootEl) return;
    updateLatency(root);
    updateNetwork(root);
    updateLastUpdate(root);
    updateValues(els);
  });
}

function updateLatency(root) {
  const chip = root.querySelector('#latencyChip');
  const ms = get('latencyMs');
  const badge = root.querySelector('#liveBadge');
  if (!chip) return;
  if (Number.isFinite(ms)) {
    chip.textContent = `${iso('\u21C5 ' + Math.round(ms) + ' ms')}`;
    chip.classList.toggle('ok', ms < 700);
    chip.classList.toggle('warn', ms >= 700 && ms < 1600);
    chip.classList.toggle('bad', ms >= 1600);
    badge?.classList.toggle('on', true);
  } else {
    chip.textContent = iso('— ms');
    chip.classList.remove('ok', 'warn', 'bad');
  }
}

function updateNetwork(root) {
  const banner = root.querySelector('#netBanner');
  const online = get('online');
  const hasAny = Object.keys(get('prices') || {}).length > 0;
  const stale = !!get('stale');
  if (!banner) return;
  banner.hidden = !(!online || (stale && hasAny === false));
  if (!banner.hidden) {
    const age = snapshotAge();
    const ageTxt = Number.isFinite(age) && age < 7 * 24 * 3600e3 ? timeAgo(Date.now() - age, get('lang')) : '';
    root.querySelector('#netText').innerHTML = `${t('ui.offline')}${ageTxt ? ` (${ageTxt})` : ''}`;
  }
  root.querySelector('#liveBadge')?.classList.toggle('offline', !online);
}

function updateLastUpdate(root) {
  const p = root.querySelector('#lastUpdate');
  const lu = get('lastUpdate');
  if (!lu) { p.textContent = t('ui.noData'); return; }
  p.innerHTML = `${t('ui.updated')}: ${timeAgo(lu, get('lang'))}`;
}

function updateValues(els) {
  for (const [, item] of els) {
    const v = item.compute ? item.compute() : NaN;
    const target = Number.isFinite(v) ? v : NaN;
    const shown = Number.isFinite(target);
    if (shown) {
      const prev = item.el.dataset.v;
      countUp(item.el, target, { decimals: item.dec || 2 });
      item.el.dataset.copiedVal = fmtClipboard(target);
      if (item.flashable && prev != null && Number(prev) !== target) {
        flash(item.el, target > Number(prev || 0));
      }
    } else {
      item.el.textContent = '—';
      delete item.el.dataset.copiedVal;
    }
  }
  // قيم FX tiles (تحويل مباشر)
  for (const code of get('currencies')) {
    if (code === 'USD') continue;
    const item = els.get(`fx:${code}`);
    if (!item) continue;
    const v = convert(1, 'USD', code);
    if (Number.isFinite(v)) {
      countUp(item.el, v, { decimals: v >= 1000 ? 0 : 2 });
      item.el.dataset.copiedVal = fmtClipboard(v);
    }
  }
}

function fmtClipboard(v) {
  const abs = Math.abs(v);
  const d = abs >= 10000 ? 0 : abs < 1 ? 4 : 2;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
}
