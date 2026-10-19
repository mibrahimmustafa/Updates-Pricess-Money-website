/**
 * pages/alerts.js — التنبيهات — Phase 6
 * إنشاء: معدن (من الظاهرة) + عملة (من الظاهرة) + سعر مستهدف لكل جرام + فوق/تحت.
 * إدارة: تشغيل/إيقاف/حذف + فرز حسب الأقرب للتفعيل + سجل تفعيل.
 */

import { get, subscribe } from '../store.js';
import { formatMoney } from '../format.js';
import { karatUsdPerGram, convert, sensibleDecimals } from '../money.js';
import { t } from '../i18n.js';
import * as engine from '../alertsEngine.js';
import * as ui from '../ui.js';
import { assetName, assetIcon, curName, curFlag, curSymbol, lang } from '../names.js';

export function renderAlerts(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title">${t('alerts.title')}</h1>
    <form class="card" data-slot="form"></form>
    <h2 class="section-title">${t('alerts.list')}</h2>
    <span class="text-dim" style="font-size:12px">${t('alerts.sortedBy')}</span>
    <div class="link-list" data-slot="list"></div>
    <div class="card" data-slot="historyCard">
      <h2 class="section-title">${t('alerts.history')}</h2>
      <div data-slot="history"></div>
    </div>`;

  container.append(el);
  ui.bindRipples(el);

  const form = el.querySelector('[data-slot=form]');
  const listSlot = el.querySelector('[data-slot=list]');
  const historySlot = el.querySelector('[data-slot=history]');

  let asset = (get('metals') || [])[0] || 'XAU';
  let currency = get('displayCurrency') || 'EGP';
  let mode = 'above';
  let targetV = 100;

  function suggestedTarget() {
    const ug = karatUsdPerGram('21K');
    const r = ug != null ? convert(ug, 'USD', currency) : null;
    return r != null ? Math.round(r * 10) / 10 : 100.0;
  }

  /* ---- استمارة الإنشاء ---- */
  let targetInputBuilt = false;

  function buildForm() {
    const l = lang();
    form.replaceChildren();
    const head = document.createElement('h2');
    head.className = 'section-title';
    head.style.marginBlock = '4px';
    head.textContent = t('alerts.create');
    form.append(head);

    form.append(
      ui.selectEl({
        label: t('alerts.asset'),
        value: asset,
        options: (get('metals') || []).map(m => ({ value: m, text: `${assetIcon(m)} ${assetName(m)}` })),
        onchange: v => { asset = v; },
      }),
      ui.selectEl({
        label: t('alerts.currency'),
        value: currency,
        options: (get('currencies') || []).map(c => ({ value: c, text: `${curFlag(c)} ${curName(c)}` })),
        onchange: v => { currency = v; },
      }),
      ui.numberInput({
        label: t('alerts.target'),
        value: targetV, min: 0.01, step: targetV >= 100 ? 10 : 1,
        onInput: v => { targetV = v; },
      }),
      ui.segmented({
        value: mode,
        options: [{ value: 'above', text: '▲ ' + t('alerts.above') }, { value: 'below', text: '▼ ' + t('alerts.below') }],
        onChange: v => { mode = v; },
      }),
    );

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn-primary rippled';
    submit.textContent = t('alerts.saveBtn');
    form.append(submit);
    targetInputBuilt = true;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!(targetV > 0)) {
      targetV = suggestedTarget();
      return ui.toast(t('alerts.target') + ' > 0', { icon: '⚠️' });
    }
    engine.add({ asset, currency, target: targetV, mode });
    ui.toast(t('alerts.created'), { icon: '✅' });
    paintList();
    paintHistory();
  });

  /* ---- القائمة ---- */
  function paintList() {
    const items = engine.sorted();
    if (!items.length) {
      listSlot.innerHTML = `<div class="empty-state"><span class="es-icon">🔔</span>${t('alerts.empty')}</div>`;
      return;
    }
    listSlot.replaceChildren(...items.map(a => {
      const now = engine.currentGramPrice(a.asset, a.currency);
      const gapRatio = now != null ? Math.abs(now - a.target) / Math.max(1e-9, Math.abs(a.target)) : 1;
      const progress = a.triggeredAt ? 100 : Math.round(Math.max(0, Math.min(1, 1 - gapRatio * 3)) * 100);

      const row = document.createElement('div');
      row.className = 'alert-row' + (a.triggeredAt ? ' is-fired' : a.active ? '' : ' is-paused');
      row.innerHTML = `
        <span class="metal-icon" style="--mc:var(--gold);width:38px;height:38px;font-size:17px" aria-hidden="true">${assetIcon(a.asset)}</span>
        <div class="alert-main">
          <div class="alert-line1">
            ${assetName(a.asset)} · ${curFlag(a.currency)} ${a.currency}
            <span class="alert-target num" dir="ltr">${a.mode === 'above' ? '▲' : '▼'} ${formatMoney(a.target, { decimals: sensibleDecimals(a.target) })} ${curSymbol(a.currency)}</span>
          </div>
          <div class="alert-now num" dir="ltr">${t('alerts.current')}: ${now == null ? '—' : formatMoney(now, { decimals: sensibleDecimals(now) })} ${curSymbol(a.currency)}</div>
          <div class="alert-progress"><i style="width:${progress}%"></i></div>
          ${a.triggeredAt ? `<span class="text-dim num" style="font-size:11px" dir="ltr">${t('alerts.fired')} · ${new Date(a.triggeredAt).toLocaleString(lang() === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>` : ''}
        </div>
        <div class="alert-actions">
          <button class="icon-btn" type="button" data-act="toggle" aria-label="${a.active ? t('alerts.disable') : t('alerts.enable')}" title="${a.active ? t('alerts.disable') : t('alerts.enable')}">${a.active ? '⏸' : '▶'}</button>
          <button class="icon-btn danger" type="button" data-act="del" aria-label="${t('alerts.delete')}" title="${t('alerts.delete')}">🗑</button>
        </div>`;
      row.querySelector('[data-act=toggle]').addEventListener('click', () => { engine.toggle(a.id); paintList(); });
      row.querySelector('[data-act=del]').addEventListener('click', () => { engine.remove(a.id); paintList(); paintHistory(); });
      return row;
    }));
  }

  function paintHistory() {
    const fired = engine.all().filter(a => a.triggeredAt).sort((x, y) => y.triggeredAt - x.triggeredAt);
    if (!fired.length) { historySlot.innerHTML = `<p class="empty-note">${t('alerts.noHistory')}</p>`; return; }
    historySlot.innerHTML = fired.map(a => `
      <div class="alert-row is-fired" style="margin-block:8px">
        <div class="alert-main">
          <div class="alert-line1">${assetIcon(a.asset)} ${assetName(a.asset)} <span class="alert-target num" dir="ltr">${formatMoney(a.target)} ${curSymbol(a.currency)}</span></div>
          <span class="text-dim num" style="font-size:11px" dir="ltr">${t('alerts.triggeredAt', { t: new Date(a.triggeredAt).toLocaleString(lang() === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) })}</span>
        </div>
      </div>`).join('');
  }

  buildForm();
  paintList();
  paintHistory();

  const unsub = subscribe(changed => {
    if (changed.some(c => ['prices', 'usdRates', 'metals', 'currencies', 'displayCurrency'].includes(c))) buildForm();
    if (changed.some(c => ['prices', 'usdRates'].includes(c))) paintList();
  });
  return () => unsub();
}
