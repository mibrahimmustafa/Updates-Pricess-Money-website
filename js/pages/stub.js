/**
 * pages/stub.js — بلاطة "قيد البناء" الموحدة للصفحات اللي هتُبنى في مراحل لاحقة.
 * تُستبدل ملف كل صفحة بمحتواها الحقيقي في مرحلتها (Home P3, Settings P4, ...).
 */

import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container
 * @param {{ phase: number, phaseKey?: string }} cfg
 */
export function renderStub(container, { phase, phaseKey }) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `
    <h1 class="page-title" data-i18n="${phaseKey}">${t(phaseKey)}</h1>
    <div class="stub card">
      <div class="stub-icon" aria-hidden="true">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
          <path d="M12 2 3 7h18l-9-5Zm0 0v20M5 9h14l-2 11H7L5 9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 data-i18n="stub.title">${t('stub.title')}</h2>
      <p data-i18n="stub.phase">${t('stub.phase', { n: phase })}</p>
    </div>`;
  container.append(el);
  return () => {}; // لا مستمعات للتنظيف في المرحلة الحالية
}
