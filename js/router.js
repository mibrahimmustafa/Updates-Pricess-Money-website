/**
 * router.js — Hash Router + Shell — Task 1.4
 * مسارات: #/home … كل مسار يستدعي render(container) ويستلم دالة cleanup.
 */

import { applyI18n } from './i18n.js';
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
  cleanup = renderPage[name](c) || null;              // كل صفحة تعيد دالة تنظيف اختياريّة
  highlight(name);
  applyRouteMeta(name);                                // meta + canonical + og لكل مسار
  applyI18n();                                         // ترجمة عناصر data-i18n بعد كل تعميل (بدونها تبقى فاضية)
  window.scrollTo({ top: 0, behavior: 'instant' });
  attachDelegation(c);
}

/**
 * تفويض نقر موحد: أي عنصر [data-live] داخل الصفحات يُعاد بناؤه عند تغير
 * القيَم المشتركة — آلية تحديث الحالة على استاستاسات Pub/Sub.
 */
function attachDelegation(root) { /* يُستخدم لاحقاً من صفحات المراحل التالية */ }

export function start() {
  window.addEventListener('hashchange', render);
  render();
}
