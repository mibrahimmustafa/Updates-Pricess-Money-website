/**
 * main.js — نقطة الإقلاع: store → i18n/SEO → polling (SWR) → router → SW
 * ترتيب حاسم: تفضيلات المستخدم على <html> قبل رسم أي شيء (منع وميض ثيم/لغة خاطئة).
 */

import * as store from './store.js';
import { applyI18n } from './i18n.js';
import * as seo from './seo.js';
import * as polling from './polling.js';
import { start as startRouter } from './router.js';

store.init();      // prefs + theme + online listeners
applyI18n();       // lang/dir + [data-i18n] في الشل الثابت
seo.init();        // JSON-LD ثابت (Organization/WebSite/WebApplication/FAQ)
polling.start();   // لقطة الكاش فوراً ثم جلب حي + دورة 30s + ساعة الاستجابة
startRouter();     // يرسم الصفحة الأولى حسب الـ hash

// تسجيل Service Worker (PWA — Phase 9): localhost مسموح بلا HTTPS، الإنتاج عبر HTTPS
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* التطبيق يعمل بدونه */ });
}
