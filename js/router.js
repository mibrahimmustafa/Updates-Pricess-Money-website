/**
 * router.js — Hash Router + Shell — Task 1.4
 * مسارات: #/home … كل مسار يستدعي render(container) ويستلم دالة cleanup.
 */

import { t, applyI18n } from './i18n.js';
import { subscribe } from './store.js';
import { renderPage } from './pages/registry.js';
import { applyRouteMeta } from './seo.js';

/** جدول المسارات: regex بسيط مقابل اسم الصفحة (registry يحمل الربط) */
const UNKNOWN = 'home';

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '').toLowerCase();
  const name = hash.split('?')[0].trim();
  return renderPage[name] ? name : UNKNOWN;
}

/** تحديث حالة التبويب النشط في التنقل (aria-current + كلاس) */
function highlight(navName) {
  document.querySelectorAll('#navbar [data-nav]').forEach(btn => {
    const active = btn.dataset.nav === navName;
    btn.classList.toggle('is-active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}

const container = () => document.getElementById('app');
let cleanup = null;

function render() {
  const name = currentRoute();
  if (cleanup) { cleanup(); cleanup = null; }        // إزالة مستمعات الصفحة السابقة
  const c = container();
  c.replaceChildren();                                // تنظيف حاسم لمنع تسريب DOM
  cleanup = renderPage[name](c) || null;              // كل صفحة تعيد دالة تنظيف اختيارية
  highlight(name);
  applyRouteMeta(name);                                // meta + canonical + og لكل مسار
  window.scrollTo({ top: 0, behavior: 'instant' });
  attachDelegation(c);
}

function titleFor(name) {
  const map = {
    converter: 'nav.converter', jewelry: 'nav.jewelry', settings: 'nav.settings', more: 'nav.more',
    alerts: 'page.alerts.title', chart: 'page.chart.title',
    timemachine: 'page.timemachine.title', cbe: 'page.cbe.title', home: 'nav.home',
  };
  return `${t(map[name] || 'nav.home')} · ${t('app.name')}`;
}

/**
 * تفويض نقر موحد: أي عنصر [data-live] داخل الصفحات يُعاد بناؤه عند تغير
 * القيَم المشتركة — آلية تحديث الحالة على استاستاسات Pub/Sub.
 */
function attachDelegation(root) { /* يُستخدم لاحقاً من صفحات المراحل التالية */ }

export function start() {
  applyI18n();
  window.addEventListener('hashchange', render);
  subscribe(() => { if (document.hidden) return; syncNavText(); }); // تبديل لغة → نصوص التنقل
  render();
}

function syncNavText() {
  document.querySelectorAll('#navbar [data-nav]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.querySelector('.nav-label').textContent = t(key);
  });
}
