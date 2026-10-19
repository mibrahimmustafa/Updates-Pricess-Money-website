/**
 * pages/registry.js — سجل الصفحات: كل صفحة تُصدّر دالة render(container) → cleanupFn
 * (بديل تدوير نظام الصفحات المكوّني، في شكل دوال بسيطة قابلة للاستبدال مرحلياً)
 */

import { renderHome } from './home.js';
import { renderConverter } from './converter.js';
import { renderJewelry } from './jewelry.js';
import { renderAlerts } from './alerts.js';
import { renderChart } from './chart.js';
import { renderTimeMachine } from './timemachine.js';
import { renderCBE } from './cbe.js';
import { renderSettings } from './settings.js';
import { renderMore } from './more.js';
import { renderPrivacy } from './privacy.js';
import { renderTerms } from './terms.js';

export const renderPage = Object.freeze({
  home: renderHome,
  converter: renderConverter,
  jewelry: renderJewelry,
  alerts: renderAlerts,
  chart: renderChart,
  timemachine: renderTimeMachine,
  cbe: renderCBE,
  settings: renderSettings,
  more: renderMore,
  privacy: renderPrivacy,
  terms: renderTerms,
});
