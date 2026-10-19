/**
 * pages/more.js — روابط الشاشات الإضافية — Phase 5.9
 */

import { el } from '../ui.js';
import { t } from '../i18n.js';

export function renderMore(container) {
  const page = el('section', { class: 'page more' });
  const title = el('h1', { class: 'page-title', text: t('more.hint'), 'data-i18n': 'more.hint' });
  const list = el('div', { class: 'link-list' });

  const links = [
    ['chart', 'ch.title', '📈'],
    ['alerts', 'al.title', '🔔'],
    ['timemachine', 'tm.title', '⏳'],
    ['cbe', 'cbe.title', '🏦'],
  ];
  for (const [route, key, icon] of links) {
    list.append(el('a', {
      class: 'link-item rippleable', href: `#/${route}`,
    },
      el('span', { class: 'li-icon', text: icon, 'aria-hidden': 'true' }),
      el('span', { text: t(key), 'data-i18n': key }),
      el('span', { class: 'li-arrow num', text: get('lang') === 'ar' ? '←' : '→', 'aria-hidden': 'true' }),
    ));
  }

  // روابط قانونية/سياسات — قسم منفصل أسفل القائمة
  const legal = el('div', { class: 'link-list legal-list' });
  for (const [route, key, icon] of [
    ['privacy', 'pv.title', '🔒'],
    ['terms', 'tos.title', '📜'],
  ]) {
    legal.append(el('a', {
      class: 'link-item rippleable', href: `#/${route}`,
    },
      el('span', { class: 'li-icon', text: icon, 'aria-hidden': 'true' }),
      el('span', { text: t(key), 'data-i18n': key }),
      el('span', { class: 'li-arrow num', text: get('lang') === 'ar' ? '←' : '→', 'aria-hidden': 'true' }),
    ));
  }

  page.append(title, list, el('h2', { class: 'sec-title', text: t('legal.linksTitle'), 'data-i18n': 'legal.linksTitle' }), legal);

  // شارة الإصدار الفعلي (من مفاتيح كاش الـSW بعد التفعيل) — تكشف فوراً نسخة قديمة على الاستضافة
  const vHint = el('p', { class: 'hint', text: '' });
  page.append(vHint);
  (async () => {
    try {
      const keys = await caches.keys();
      const v = [...keys].map(k => /pm-v[\w.]+/.exec(k)?.[0]).find(Boolean);
      const hasSW = !!(await navigator.serviceWorker?.getRegistrations())?.length;
      vHint.textContent = v ? `${t('ui.version')}: ${v}${hasSW ? '' : ` · ${t('ui.noSw')}`}` : t('ui.noSw');
    } catch { /* لوبيا — رفاهية */ }
  })();
  container.append(page);
  return () => {};
}
// استيراد متأخر لتجنب دورة imports
import { get } from '../store.js';
