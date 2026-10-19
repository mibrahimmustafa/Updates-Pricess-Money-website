/**
 * pages/terms.js — شروط الاستخدام — محتوى المفاتيح tos.* في i18n
 */

import { renderLegalPage } from './legal.js';

export function renderTerms(container) {
  return renderLegalPage('tos', container);
}
