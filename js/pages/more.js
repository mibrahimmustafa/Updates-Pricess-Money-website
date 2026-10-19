/**
 * pages/more.js — شاشة المزيد — Phase 5.9
 * تنقّل لكل الشاشات الثانوية: Chart / Alerts / Time Machine / CBE.
 */

import { t } from '../i18n.js';
import * as ui from '../ui.js';

const LINKS = [
  { hash: '#/chart', icon: '📈', title: 'page.chart.title', sub: 'more.chart.sub' },
  { hash: '#/alerts', icon: '🔔', title: 'page.alerts.title', sub: 'more.alerts.sub' },
  { hash: '#/timemachine', icon: '⏳', title: 'page.timemachine.title', sub: 'more.tm.sub' },
  { hash: '#/cbe', icon: '🏦', title: 'page.cbe.title', sub: 'more.cbe.sub' },
];

export function renderMore(container) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title">${t('more.title')}</h1>
    <p class="text-dim" style="margin:-8px 0 0">${t('more.hint')}</p>
    <div class="link-list">
      ${LINKS.map((l, i) => `
        <a class="link-item rippled" href="${l.hash}" style="animation-delay:${i * 60}ms">
          <span class="li-icon" aria-hidden="true">${l.icon}</span>
          <span class="li-text"><span>${t(l.title)}</span><span class="li-sub">${t(l.sub)}</span></span>
          <span class="li-arrow" aria-hidden="true">→</span>
        </a>`).join('')}
    </div>
    <div class="card" style="text-align:center">
      <div style="display:inline-flex;align-items:center;gap:10px">
        <span class="brand-logo" aria-hidden="true" style="width:44px;height:44px;font-size:14px">PM</span>
        <div style="text-align:start">
          <div style="font-weight:800" dir="ltr">Pricess Money</div>
          <div class="text-dim" style="font-size:12px">${t('app.tagline')}</div>
        </div>
      </div>
    </div>`;

  container.append(el);
  ui.bindRipples(el);
  return () => {};
}
