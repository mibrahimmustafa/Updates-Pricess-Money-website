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
  navigator.serviceWorker.register('./sw.js').then(reg => {
    // استدعاء تحديث دوري + عند الرجوع للتبويب: أسرع من افتراضي المتصفح
    // — يضمن الانتقال للنسخة الجديدة بمجرد رفعها للاستضافة
    setInterval(() => { try { reg.update(); } catch { /* رفاهية */ } }, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { try { reg.update(); } catch { /* رفاهية */ } }
    });
  }).catch(() => { /* التطبيق يعمل بدونه */ });

  // سيرفر جديد تولى السيطرة (نسخة أحدث نُشرت) → تحميل تلقائيّة مرة واحدة.
  // هذا يمنع "مزيج أجيال" كود قديم/جديد الناجم عن SW cache-first بعد رفع ملفات جديدة.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !navigator.serviceWorker.controller) return; // أول تسجيل لا يُعد تحميلاً
    reloaded = true;
    location.reload();
  });
}
