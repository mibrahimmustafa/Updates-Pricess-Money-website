/**
 * pages/alerts.js — التنبيهات — Phase 6
 * إنشاء تنبيه (معدن ظاهر × عملة ظاهرة × سعر لكل جرام × فوق/تحت)
 * + قائمة مفرزة حسب الأقرب للتفعيل + تشغيل/إيقاف/حذف + شريط تقدّم قرب الهدف.
 */

import { get, subscribe } from '../store.js';
import { ASSETS, CURRENCY_MAP, ASSET_MAP, flagEmoji, pricePerGramUSD } from '../pools.js';
import * as engine from '../alertsEngine.js';
import { formatMoney, iso } from '../format.js';
import { t } from '../i18n.js';
import { el, toast } from '../ui.js';

let root = null;
let form = {};

export function renderAlerts(container) {
  root = el('section', { class: 'page alerts' });

  // ============ نموذج الإنشاء ============
  const card = el('div', { class: 'card al-create' });
  card.append(el('h1', { class: 'page-title', text: t('al.title') }));

  const assetSel = el('select', { class: 'select rippleable', 'aria-label': t('al.asset') });
  for (const code of get('metals')) {
    const a = ASSET_MAP.get(code);
    assetSel.append(el('option', { value: code, text: `${a.icon} ${get('lang') === 'ar' ? a.ar : a.en}` }));
  }
  const curSel = el('select', { class: 'select rippleable', 'aria-label': t('al.currency') });
  for (const code of get('currencies')) {
    const c = CURRENCY_MAP.get(code);
    curSel.append(el('option', { value: code, text: `${flagEmoji(code)} ${code} — ${c.ar}` }));
  }
  const target = el('input', {
    class: 'input num', type: 'number', inputmode: 'decimal', min: '0', step: 'any',
    placeholder: '0.00', 'aria-label': t('al.target'),
  });

  const dirSeg = el('div', { class: 'segmented', role: 'group', 'aria-label': 'direction' });
  for (const [d, key] of [['above', 'al.above'], ['below', 'al.below']]) {
    dirSeg.append(el('button', {
      type: 'button', class: `seg-btn rippleable${d === 'above' ? ' active' : ''}`, dataset: { dir: d },
      onclick: (e) => { selectedDir = d; dirSeg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === e.currentTarget)); },
    }, el('span', { text: t(key) })));
  }
  let selectedDir = 'above';

  const gramNow = el('span', { class: 'num gold', id: 'gramNowPill' }, '—');
  const syncGramNow = () => {
    const v = engine.gramPrice(assetSel.value, curSel.value);
    gramNow.textContent = Number.isFinite(v) ? iso(formatMoney(v)) + ' ' + (CURRENCY_MAP.get(curSel.value)?.symbol || '') : '—';
  };
  assetSel.addEventListener('change', syncGramNow);
  curSel.addEventListener('change', syncGramNow);
  [assetSel, curSel].forEach(s => s.classList.add('rippleable'));

  const addBtn = el('button', {
    type: 'button', class: 'btn btn-gold rippleable',
    text: t('al.add'),
    onclick: () => {
      const val = parseFloat(target.value);
      if (!Number.isFinite(val) || val <= 0) { toast(t('al.invalidTarget'), { kind: 'warn', icon: '⚠️' }); return; }
      engine.addAlert({ asset: assetSel.value, currency: curSel.value, target: val, direction: selectedDir });
      target.value = '';
      toast(t('ui.saved') + ' ✓', { kind: 'success', ms: 2200 });
      paintList();
    },
  });

  card.append(
    el('h2', { class: 'sec-title', text: t('al.create') }),
    el('div', { class: 'two-col' }, field(t('al.asset'), assetSel), field(t('al.currency'), curSel)),
    el('div', { class: 'two-col' },
      field(t('al.target'), el('div', {}, target, el('p', { class: 'hint' }, t('al.now') + ': ', gramNow))),
      field('↓', dirSeg),
    ),
    addBtn,
  );

  // ============ القائمة ============
  const listCard = el('div', { class: 'card al-list-card' });
  listCard.append(el('h2', { class: 'sec-title', text: t('al.list') }));
  const list = el('div', { class: 'al-rows' });
  listCard.append(list);
  const listHint = el('p', { class: 'hint', text: t('al.closeToFire') });
  listCard.append(listHint);

  root.append(card, listCard);
  container.append(root);

  syncGramNow();

  function paintList() {
    const alerts = engine.sortedNearest();
    list.replaceChildren();
    if (!alerts.length) {
      list.append(el('div', { class: 'empty-state' },
        el('span', { class: 'es-icon', text: '🔔', 'aria-hidden': 'true' }),
        el('p', { text: t('al.none') }),
        el('p', { class: 'hint', text: t('al.noneHint') }),
      ));
      return;
    }
    for (const a of alerts) paintRow(list, a);
  }
  paintList();

  const unsub = subscribe((changed) => {
    if (changed.some(k => ['prices', 'usdRates', 'currencies', 'metals'].includes(k))) {
      syncGramNow();
      paintList();
    }
    if (changed.includes('currencies')) fillSel(curSel, get('currencies'), t('al.currency'));
    if (changed.includes('metals')) fillSel(assetSel, get('metals'), t('al.asset'));
  });

  return () => { unsub(); root = null; };
}

/** صف تنبيه واحد */
function paintRow(list, a) {
  const asset = ASSET_MAP.get(a.asset) || { icon: '❓', ar: a.asset, en: a.asset };
  const cur = CURRENCY_MAP.get(a.currency) || { symbol: a.currency };
  const lang = get('lang');
  const name = `${asset.icon} ${lang === 'ar' ? asset.ar : asset.en}`;
  const sym = cur.symbol || a.currency;

  const cur_ = engine.gramPrice(a.asset, a.currency);
  const dist = engine.distanceToFire(a);
  const progress = Number.isFinite(dist) ? Math.max(0, Math.min(1, 1 - dist)) : 0;

  const row = el('div', { class: `al-row card${a.fired ? ' fired' : ''}${!a.enabled ? ' paused' : ''}` });
  const targetTxt = `${iso(formatMoney(a.target))} ${sym}`;
  const nowTxt = Number.isFinite(cur_) ? `${iso(formatMoney(cur_))} ${sym}` : '—';

  row.innerHTML = `
    <div class="al-main">
      <div class="al-title">
        <span class="al-name">${name}</span>
        <span class="al-dir num">${a.direction === 'above' ? '▲' : '▼'} ${targetTxt}</span>
        ${a.fired ? `<span class="al-fired-badge" data-i18n="al.fired">${t('al.fired')}</span>` : ''}
      </div>
      <div class="al-nums num" dir="ltr">
        <span>${t('al.now')}: ${nowTxt}</span>
        <span aria-hidden="true">·</span>
        <span>${t('al.target')}: ${targetTxt}</span>
      </div>
      <div class="progress" role="img" aria-label="${progress ? Math.round(progress * 100) : 0}%">
        <div class="progress-fill" style="width:${Math.round(progress * 100)}%"></div>
      </div>
      ${a.fired ? `<p class="hint">${t('al.rearm')}</p>` : ''}
    </div>
    <div class="al-actions">
      <label class="switch sm" role="switch">
        <input type="checkbox" ${a.enabled ? 'checked' : ''} aria-label="${name}">
        <span class="slider" aria-hidden="true"></span>
      </label>
      <button type="button" class="btn btn-icon btn-danger-ghost rippleable" aria-label="${t('al.delete')} ${name}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
      </button>
    </div>`;

  row.querySelector('input[type=checkbox]').addEventListener('change', (e) => {
    engine.setEnabled(a.id, e.target.checked);
    paintListAgain();
  });
  row.querySelector('.btn-danger-ghost').addEventListener('click', () => {
    engine.removeAlert(a.id);
    toast(t('al.delete') + ' ✓', { kind: 'success', ms: 1600 });
    paintListAgain();
  });

  function paintListAgain() {
    // إعادة رسم القائمة دقيقة — عبر فحص وجود root (قد يغادر المستخدم الصفحة)
    if (!document.contains(row)) return;
    const rows = row.parentElement;
    if (rows) {
      const alerts = engine.sortedNearest();
      rows.replaceChildren();
      if (!alerts.length) return;
      alerts.forEach(x => paintRow(rows, x));
    }
  }

  list.append(row);
}

function fillSel(sel, codes, ariaKey) {
  if (!document.contains(sel)) return;
  sel.replaceChildren();
  for (const code of codes) {
    const c = CURRENCY_MAP.get(code) || ASSET_MAP.get(code);
    sel.append(el('option', { value: code, text: c?.ar || c?.en || code }));
  }
}
function field(labelText, control) {
  return el('label', { class: 'field' }, el('span', { class: 'label', text: labelText }), control);
}
