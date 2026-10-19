/**
 * main.js — نقطة الإقلاع: store → snapshot(SWR) → i18n → polling → router → SW
 * ترتيب حاسم: تفضيلات المستخدم على <html> قبل رسم أي شيء (منع وميض ثيم/لغة خاطئة).
 */

import * as store from './store.js';
import * as cache from './cache.js';
import * as polling from './polling.js';
import { applyI18n } from './i18n.js';
import { start as startRouter } from './router.js';
import './alertsEngine.js'; // يفعّل الاشتراك في تحديث الأسعار

store.init();        // prefs + theme + online listeners
cache.applySnapshotToStore(store); // Stale-While-Revalidate: عرض فوري من آخر لقطة
applyI18n();
startRouter();       // يرسم صفحة الـhash الحالي (سترسم بمعدل snapshot/فارغة في البداية)
polling.start();     // جلب فوري + دورة 30s مع إيقاف عند إخفاء التبويب

// تسجيل Service Worker (PWA — Phase 9)
if ('serviceWorker' in navigator && location.protocol === 'https:' || swDevAllow()) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* التطبيق يعمل بدونه */ });
}
function swDevAllow() {
  // تطوير محلي عبر http://localhost مسموح بدون HTTPS
  return 'serviceWorker' in navigator && ['localhost', '127.0.0.1'].includes(location.hostname);
}
