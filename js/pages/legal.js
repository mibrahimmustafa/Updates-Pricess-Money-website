/**
 * pages/legal.js — بنّاء مشترك للصفحات القانونية (الخصوصية / الشروط)
 * المحتوى من مفاتيح i18n متسلسلة: {prefix}.1h + {prefix}.1b … (h عنوان، b نص
 * بأسطر: سطر عادي = فقرة، سطر يبدأ بـ«- » = عنصر قائمة).
 * أي تغيير لغة يعيد بناء الصفحة فورياً (بلا إعادة تحميل).
 */

import { el } from '../ui.js';
import { t } from '../i18n.js';
import { get, subscribe } from '../store.js';

export function renderLegalPage(prefix, container) {
  const page = el('section', { class: 'page legal' });

  const build = () => {
    page.replaceChildren();
    page.append(el('h1', { class: 'page-title', text: t(prefix + '.title') }));
    page.append(el('p', { class: 'hint legal-updated', text: t(prefix + '.updated') }));

    for (let i = 1; i <= 16; i++) {
      const hKey = `${prefix}.${i}h`;
      const h = t(hKey);
      if (h === hKey) break; // لا مزيد من الأقسام
      page.append(el('h2', { text: h }));
      appendBody(page, t(`${prefix}.${i}b`));
    }
  };
  build();
  container.append(page);

  const unsubscribe = subscribe((changed) => {
    if (changed.includes('lang')) build();
  });
  return () => unsubscribe();
}

/** نص القسم → فقرات وقوائم حسب الأسطر */
function appendBody(page, body) {
  let ul = null;
  for (const line of (body || '').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    if (s.startsWith('- ')) {
      if (!ul) { ul = el('ul'); page.append(ul); }
      ul.append(el('li', { text: s.slice(2) }));
    } else {
      ul = null;
      page.append(el('p', { text: s }));
    }
  }
}
