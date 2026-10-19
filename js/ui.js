/**
 * ui.js — أدوات تفاعل مشتركة: منشئ DOM، Toast، عدّاد أرقام متحرك، Ripple، وميض تغيّر السعر.
 * كل الحركات تحترم prefers-reduced-motion.
 */

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** بناء عنصر بسرعة */
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v; // محتوى داخلي موثوق فقط — لا مدخلات مستخدم هنا
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    n.append(c.nodeType ? c : document.createTextNode(c));
  }
  return n;
}

/* ---------- Toast ---------- */
export function toast(msg, { kind = 'gold', icon = '', ms = 4500 } = {}) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const node = el('div', { class: `toast kind-${kind}`, role: 'status' });
  if (icon) node.append(el('span', { class: 'toast-icon', text: icon, 'aria-hidden': 'true' }));
  node.append(el('span', { text: msg }));
  wrap.append(node);
  requestAnimationFrame(() => node.classList.add('in'));
  setTimeout(() => {
    node.classList.remove('in');
    node.classList.add('out');
    setTimeout(() => node.remove(), 320);
  }, ms);
}

/* ---------- عدّاد أرقام متحرك (Count-up) ---------- */
/**
 * يحرّك قيمة نصية من قيمة سابقة إلى الجديدة.
 * @param {HTMLElement} node عنصر فيه data-v (آخر قيمة رقمية)
 */
export function countUp(node, to, { decimals = 2, dur = 650 } = {}) {
  const from = Number(node.dataset.v ?? NaN);
  node.dataset.v = String(to);
  if (reduced() || !Number.isFinite(from) || Math.abs(to - from) < 1e-9) {
    node.textContent = formatNumberFor(node, to, decimals);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const v = from + (to - from) * eased;
    node.textContent = formatNumberFor(node, v, decimals);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function formatNumberFor(node, v, dec) {
  // أرقام كبيرة (عملات ضعيفة) بلا منازل؛ صغيرة بدقة أكبر
  const abs = Math.abs(v);
  let d = dec, min = 2;
  if (abs >= 10000) { d = 0; min = 0; }
  else if (abs < 1) { d = Math.min(6, Math.max(2, dec + 2)); }
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: d }).format(v);
}

/* ---------- وميض اتجاه تغيّر السعر ---------- */
export function flash(node, dirUp) {
  if (reduced()) return;
  node.classList.remove('tick-up', 'tick-down');
  void node.offsetWidth; // إعادة تشغيل الأنيميشن
  node.classList.add(dirUp ? 'tick-up' : 'tick-down');
  const clear = () => node.classList.remove('tick-up', 'tick-down');
  node.addEventListener('animationend', clear, { once: true });
}

/* ---------- Ripple ---------- */
document.addEventListener('pointerdown', (e) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = e.target.closest?.('.rippleable');
  if (!host) return;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const rip = el('span', { class: 'ripple' });
  rip.style.width = rip.style.height = `${size}px`;
  rip.style.left = `${e.clientX - rect.left - size / 2}px`;
  rip.style.top = `${e.clientY - rect.top - size / 2}px`;
  host.append(rip);
  setTimeout(() => rip.remove(), 600);
});

/* ---------- نسخ قيمة + توست ---------- */
export async function copyText(text, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMsg, { icon: '✓', kind: 'success', ms: 2200 });
  } catch { /* الرفض الصامت أفضل من إزعاج المستخدم */ }
}

/* ---------- دقّة جرس خفيفة عند تفعيل تنبيه (اختيارية) ---------- */
export function beep() {
  try {
    if (!navigator.userActivation?.hasBeenActive) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close?.(), 500);
  } catch { /* الصوت رفاهية — لا يكسر شيئاً */ }
}
