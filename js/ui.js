/**
 * ui.js — عناصر مشتركة: toasts، skeleton، بانر الشبكة، شارة مباشر،
 * مكونات تفاعلية (chips، switches، ripple، حقول) بلمسات micro-interaction.
 * كل شيء vanilla DOM بلا مكتبات.
 */

import { t } from './i18n.js';

/* ---------- Toast ---------- */
export function toast(text, { icon = '🔔', ms = 4200, tone = 'gold' } = {}) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast toast-' + tone;
  el.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span><span class="toast-text"></span>`;
  el.querySelector('.toast-text').textContent = text;
  const btn = document.createElement('button');
  btn.className = 'toast-close';
  btn.setAttribute('aria-label', t('a11y.close'));
  btn.textContent = '✕';
  btn.addEventListener('click', () => dismiss());
  el.append(btn);
  wrap.append(el);
  requestAnimationFrame(() => el.classList.add('toast-in'));
  const tm = setTimeout(dismiss, ms);
  function dismiss() { clearTimeout(tm); el.classList.remove('toast-in'); setTimeout(() => el.remove(), 260); }
  return dismiss;
}

/* ---------- Skeleton ---------- */
export function skeletonBlocks(container, n = 3, klass = 'skel-card') {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = klass + ' skeleton';
    d.setAttribute('aria-hidden', 'true');
    frag.append(d);
  }
  container.append(frag);
}

/* ---------- بانر الشبكة ---------- */
export function netBanner({ onRetry }) {
  const b = document.createElement('div');
  b.className = 'net-banner';
  b.setAttribute('role', 'alert');
  b.innerHTML = `
    <span class="nb-icon" aria-hidden="true">⚠️</span>
    <span class="nb-text">${t('home.netError')}</span>
    <span class="nb-sub">${t('live.offline')}</span>
    <button class="nb-retry" type="button">${t('home.retry')}</button>`;
  b.querySelector('.nb-retry').addEventListener('click', () => {
    b.querySelector('.nb-retry').textContent = t('live.retrying');
    onRetry?.();
  });
  return b;
}

/* ---------- شارة "مباشر" + chip زمن الاستجابة ---------- */
export function liveBadge() {
  const el = document.createElement('div');
  el.className = 'live-badge';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-label', t('a11y.live'));
  el.innerHTML = `
    <span class="live-dot" aria-hidden="true"></span>
    <span class="live-label" data-live="label"></span>
    <span class="live-chip num" dir="ltr" data-live="latency"></span>`;
  return el;
}

/** تحديث قيم الشارة: (el, ms, online) */
export function updateLiveBadge(el, ms, online) {
  if (!el) return;
  const chip = el.querySelector('[data-live="latency"]');
  el.classList.toggle('is-offline', !online);
  el.querySelector('[data-live="label"]').textContent = online ? t('live.badge') : t('live.offline');
  if (Number.isFinite(ms)) {
    chip.textContent = ms >= 1000 ? (ms / 1000).toFixed(2) + 's' : Math.round(ms) + 'ms';
    chip.className = 'live-chip num ' + (ms < 700 ? 'lat-good' : ms < 1600 ? 'lat-warn' : 'lat-bad');
  } else {
    chip.textContent = '—';
    chip.className = 'live-chip num';
  }
}

/* ---------- Ripple خفيف للأزرار والبلاطات (يحترم reduced-motion) ---------- */
export function bindRipples(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('.rippled:not([data-rippled])').forEach(el => {
    el.dataset.rippled = '1';
    el.addEventListener('pointerdown', e => {
      const rect = el.getBoundingClientRect();
      const span = document.createElement('span');
      span.className = 'ripple';
      const size = Math.max(rect.width, rect.height) * 2;
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - rect.left - size / 2) + 'px';
      span.style.top = (e.clientY - rect.top - size / 2) + 'px';
      el.append(span);
      span.addEventListener('animationend', () => span.remove());
    });
  });
}

/* ---------- نسخ إلى الحافظة مع Toast ---------- */
export async function copyText(text, label) {
  const show = () => toast(t('home.copied', { t: label || text }), { icon: '📋' });
  try {
    await navigator.clipboard.writeText(text);
    show();
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); show(); } catch { /* لا شيء */ }
    ta.remove();
  }
}

/* ---------- select منسق ---------- */
export function selectEl({ label, options, value, onchange }) {
  const w = document.createElement('label');
  w.className = 'field';
  if (label) {
    const l = document.createElement('span');
    l.className = 'field-label';
    l.textContent = label;
    w.append(l);
  }
  const s = document.createElement('select');
  s.className = 'field-input';
  options.forEach(o => {
    if (o.group) {
      const g = document.createElement('optgroup');
      g.label = o.groupLabel || o.group;
      (o.items || []).forEach(it => g.append(new Option(it.text, it.value, false, it.value === value)));
      s.append(g);
    } else {
      s.append(new Option(o.text, o.value, false, o.value === value));
    }
  });
  if (onchange) s.addEventListener('change', () => onchange(s.value));
  w.append(s);
  return w;
}

/* ---------- حقل رقمي بأسهم +/− (touch 44px ✓) ---------- */
export function numberInput({ label, value = 0, min = 0, max = 1e12, step = 1, suffix, onInput }) {
  const w = document.createElement('label');
  w.className = 'field';
  if (label) {
    const l = document.createElement('span');
    l.className = 'field-label';
    l.textContent = label;
    w.append(l);
  }
  const box = document.createElement('div');
  box.className = 'number-box';
  const dec = document.createElement('button');
  dec.type = 'button'; dec.className = 'btn-num'; dec.textContent = '−';
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.className = 'field-input num';
  inp.value = value;
  inp.min = min; inp.max = max; inp.step = step;
  inp.setAttribute('inputmode', 'decimal');
  const inc = document.createElement('button');
  inc.type = 'button'; inc.className = 'btn-num'; inc.textContent = '+';
  const clamp = () => Math.min(max, Math.max(min, Number(inp.value) || 0));
  dec.addEventListener('click', () => { inp.value = clamp() - step < min ? min : clamp() - step; onInput?.(clamp()); });
  inc.addEventListener('click', () => { inp.value = clamp() + step > max ? max : clamp() + step; onInput?.(clamp()); });
  inp.addEventListener('input', () => onInput?.(clamp()));
  box.append(dec, inp, inc);
  if (suffix) {
    const s = document.createElement('span');
    s.className = 'num-suffix';
    s.textContent = suffix;
    box.append(s);
  }
  w.append(box);
  return w;
}

/* ---------- مفتاح متبادل ---------- */
export function switchEl({ label, checked, onChange }) {
  const w = document.createElement('label');
  w.className = 'switch-row';
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.className = 'switch-input visually-hidden-input';
  inp.checked = !!checked;
  const sw = document.createElement('span');
  sw.className = 'switch-ui';
  sw.setAttribute('aria-hidden', 'true');
  const txt = document.createElement('span');
  txt.className = 'switch-text';
  txt.textContent = label;
  w.append(inp, sw, txt);
  inp.addEventListener('change', () => onChange?.(inp.checked));
  return w;
}

/* ---------- شرائح قابلة للاختيار ---------- */
export function chipSet({ items, selected = [], onToggle, extraClass = '' }) {
  const wrap = document.createElement('div');
  wrap.className = 'chip-row ' + extraClass;
  wrap.setAttribute('role', 'group');
  items.forEach(({ value, text }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (selected.includes(value) ? ' is-on' : '');
    b.dataset.value = value;
    b.textContent = text;
    b.addEventListener('click', () => {
      const on = b.classList.toggle('is-on');
      onToggle?.(value, on);
    });
    wrap.append(b);
  });
  return wrap;
}

/** شرائح اختيار واحد (segmented control) */
export function segmented({ options, value, onChange, extraClass = '' }) {
  const w = document.createElement('div');
  w.className = 'segmented ' + extraClass;
  w.setAttribute('role', 'tablist');
  options.forEach(o => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'segment' + (o.value === value ? ' is-on' : '');
    b.textContent = o.text;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => {
      w.querySelectorAll('.segment').forEach(s => s.classList.remove('is-on'));
      b.classList.add('is-on');
      onChange?.(o.value);
    });
    w.append(b);
  });
  return w;
}
