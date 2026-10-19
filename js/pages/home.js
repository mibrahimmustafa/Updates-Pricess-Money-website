/**
 * pages/home.js — الصفحة الرئيسية — Phase 3 (القلب)
 * شريط فوركس أفقي + بطاقات معادن + جدول جرام لكل عملة + عيارات الذهب
 * + skeleton + بانر خطأ + "آخر تحدّث" + JSON-LD + نسخ الأسعار.
 */

import { get, subscribe } from '../store.js';
import { CURRENCY_MAP, KARATS, TROY_OZ_GRAMS } from '../pools.js';
import { formatMoney, timeAgo } from '../format.js';
import { convert, sensibleDecimals } from '../money.js';
import { t } from '../i18n.js';
import * as ui from '../ui.js';
import { assetName, assetIcon, assetColor, curSymbol, curFlag, curName } from '../names.js';

export function renderHome(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <div class="home-top">
      <div data-slot="live"></div>
      <span class="last-update text-dim" data-live="lastUpdate"></span>
    </div>
    <div data-slot="banner"></div>
    <h2 class="section-title">${t('home.forexTitle')}</h2>
    <div class="fx-strip" data-slot="fx"></div>
    <h2 class="section-title">${t('home.metalsTitle')}</h2>
    <div class="metals-grid" data-slot="metals"></div>`;

  container.append(el);
  ui.bindRipples(el);

  const slots = {
    live: el.querySelector('[data-slot=live]'),
    banner: el.querySelector('[data-slot=banner]'),
    fx: el.querySelector('[data-slot=fx]'),
    metals: el.querySelector('[data-slot=metals]'),
    lastUpdate: el.querySelector('[data-live=lastUpdate]'),
  };

  const badge = ui.liveBadge();
  slots.live.append(badge);

  /* ---- بنية الشاشة (تُبنى من جديد فقط عند تغيّر قائمة العملات/المعادن) ---- */
  let builtCurrencies = '', builtMetals = '';

  function buildForex() {
    const codes = get('currencies') || [];
    builtCurrencies = codes.join(',');
    slots.fx.replaceChildren(...codes.map(c => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'fx-tile rippled';
      tile.dataset.cur = c;
      tile.title = curName(c);
      tile.innerHTML = `
        <span class="fx-q" dir="ltr"><span class="num">1 USD</span><span class="fx-arrow">→</span>
          <span class="fx-flag">${curFlag(c)}</span><span class="fx-sym num">${c}</span></span>
        <span class="fx-val num" data-live="fx">—</span>`;
      return tile;
    }));
    if (!codes.length) slots.fx.textContent = ''; // حماية
  }

  function buildMetals() {
    const mets = get('metals') || [];
    builtMetals = mets.join(',');
    slots.metals.replaceChildren(...mets.map(m => {
      const a = ASSET_MAP.get(m);
      const unitLabel = a.unit === 'coin' ? t('home.perCoin') : a.unit === 'lb' ? t('home.perLb') : t('home.perOz');
      const card = document.createElement('article');
      card.className = 'metal-card card card-hover';
      card.style.setProperty('--mc', assetColor(m));
      card.innerHTML = `
        <div class="metal-head">
          <span class="metal-icon" aria-hidden="true">${assetIcon(m)}</span>
          <div><div class="metal-name">${assetName(m)}</div><div class="metal-unit num" dir="ltr">${m}</div></div>
          <div class="metal-oz">
            <div class="oz-val num" data-live="oz">—</div>
            <div class="oz-usd num" dir="ltr">USD · ${unitLabel}</div>
          </div>
          <button class="metal-copy" type="button" aria-label="${t('a11y.copyPrice')}" title="${t('a11y.copyPrice')}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
          </button>
        </div>
        <table class="gram-table"><tbody data-slot="grams"></tbody></table>
        ${m === 'XAU' ? '<div class="karats" data-slot="karats"></div>' : ''}`;
      card.querySelector('.metal-copy').addEventListener('click', () => {
        ui.copyText(String(card.querySelector('[data-live=oz]').textContent.replace(/[^\d.,]/g, '')), `${m} USD`);
      });
      return card;
    }));
  }

  /* ---- الرسم (يُستدعى مع كل تحديث — تحديث قيم فقط بلا إعادة بناء) ---- */
  function paint() {
    const rates = get('usdRates') || {};
    const prices = get('prices') || {};
    const disp = get('displayCurrency') || 'EGP';
    const online = get('online');
    const lu = get('lastUpdate');

    ui.updateLiveBadge(badge, get('latencyMs'), online);
    paintLastUpdate(lu);

    // بانر الشبكة
    if (!online) {
      if (!slots.banner.childElementCount) {
        slots.banner.append(ui.netBanner({ onRetry: () => import('../polling.js').then(p => p.force()) }));
      }
    } else if (slots.banner.childElementCount) slots.banner.replaceChildren();

    // الفوركس
    slots.fx.querySelectorAll('.fx-tile').forEach(tile => {
      const v = rates[tile.dataset.cur];
      tile.querySelector('[data-live=fx]').textContent = v != null ? formatMoney(v, { decimals: sensibleDecimals(v) }) : '—';
    });

    // بطاقات المعادن
    [...slots.metals.children].forEach((card, i) => {
      const m = (get('metals') || [])[i];
      if (!m) return;
      const up = prices[m]?.usd ?? null;
      card.querySelector('[data-live=oz]').textContent = up != null ? formatMoney(up) : '—';
      paintTable(card.querySelector('[data-slot=grams]'), m, up, rates, disp);
      const karatSlot = card.querySelector('[data-slot=karats]');
      if (karatSlot && m === 'XAU') paintKarats(karatSlot, up, rates, disp);
    });

    updateJsonLd();
  }

  function paintLastUpdate(lu) {
    if (!lu) { slots.lastUpdate.textContent = ''; return; }
    slots.lastUpdate.textContent = Date.now() - lu < 5000 ? t('live.updatedNow') : t('live.updatedAgo', { t: timeAgo(lu) });
  }

  function paintTable(tbody, m, up, rates, disp) {
    const codes = get('currencies') || [];
    const sig = codes.join(',') + '|' + (up ?? 'x');
    if (tbody.dataset.sig === sig) return;
    tbody.dataset.sig = sig;
    const rows = codes.map((c, idx) => {
      const val = up != null ? convert(up, 'USD', c) : null;
      return `
        <tr class="gram-row" style="animation-delay:${Math.min(idx * 30, 300)}ms">
          <td title="${curName(c)}"><span class="fx-flag-small">${curFlag(c)}</span>${curName(c)}</td>
          <td><span class="gram-value num">${val == null ? '—' : formatMoney(val, { decimals: sensibleDecimals(val) })}</span><span class="gram-symbol">${curSymbol(c)}</span></td>
        </tr>`;
    }).join('');
    tbody.innerHTML = rows;
  }

  function paintKarats(slot, ozUp, rates, disp) {
    const r = rates[disp];
    const sig = Object.keys(KARATS).join() + '|' + (ozUp ?? 'x') + '|' + (r ?? 'x') + '|' + disp;
    if (slot.dataset.sig === sig) return;
    slot.dataset.sig = sig;
    slot.innerHTML = Object.keys(KARATS).map(k => {
      const v = ozUp != null && r != null ? (ozUp / TROY_OZ_GRAMS) * KARATS[k] * r : null;
      return `
        <div class="karat-cell${k === '21K' ? ' core' : ''}">
          <span class="k num" dir="ltr">${k}</span><span class="v num">${v == null ? '—' : formatMoney(v, { decimals: sensibleDecimals(v) })}</span>
          <span class="gram-symbol">${curSymbol(disp)}</span>
        </div>`;
    }).join('');
  }

  /* ---- Skeleton أول تحميل ---- */
  function ensureSkeletons() {
    if (!get('lastUpdate') && !slots.metals.querySelector('.skel-card')) {
      ui.skeletonBlocks(slots.metals, 3, 'skel-card');
    }
  }

  /* ---- JSON-LD للأسعار (SEO) ---- */
  function updateJsonLd() {
    const prices = get('prices') || {};
    const lu = get('lastUpdate');
    const xau = prices.XAU?.usd;
    if (!xau || !lu) return;
    const obj = {
      '@context': 'https://schema.org',
      '@type': 'PriceSpecification',
      name: 'Gold price per troy ounce (XAU)',
      price: xau,
      priceCurrency: 'USD',
      dateModified: new Date(lu).toISOString(),
    };
    let elx = document.getElementById('ld-prices');
    if (!elx) {
      elx = document.createElement('script');
      elx.type = 'application/ld+json';
      elx.id = 'ld-prices';
      document.head.append(elx);
    }
    elx.textContent = JSON.stringify(obj);
  }

  function rebuildIfNeeded() {
    const cs = (get('currencies') || []).join(',');
    const ms = (get('metals') || []).join(',');
    if (cs !== builtCurrencies) buildForex();
    if (ms !== builtMetals) { slots.metals.replaceChildren(); buildMetals(); }
  }

  rebuildIfNeeded();
  paint();
  ensureSkeletons();

  const unsub = subscribe(changed => {
    if (changed.some(c => ['currencies', 'metals'].includes(c))) rebuildIfNeeded();
    if (changed.some(c => ['prices', 'usdRates', 'online', 'latencyMs', 'lastUpdate'].includes(c))) {
      slots.metals.querySelectorAll('.skel-card').forEach(s => s.remove());
      paint();
    }
    if (changed.includes('lastUpdate')) paintLastUpdate(get('lastUpdate'));
  });

  const tick = setInterval(() => paintLastUpdate(get('lastUpdate')), 20000);
  return () => { unsub(); clearInterval(tick); };
}
