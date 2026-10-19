# ✅ QA Checklist — Pricess Money Web

## Phase 0 + Phase 1 (الحالية)

### P0 — الأساس
- [ ] هيكل المجلدات كما في الخطة (css/ js/ js/pages/ test/).
- [ ] `pools.js`: الأصول 7 + العملات 51 (وفق قائمة المواصفة التي لُقّبت "48") + الافتراضي 18.
- [ ] `flagEmoji('EGP')` = 🇪🇬 و `flagEmoji('SAR')` = 🇸🇦 من Console.
- [ ] `formatMoney(7141.719)` → "7,141.72" و `money(7141.719)` يلفها بعزل LRI/PDI.
- [ ] `store.get('currencies')` يرجع 18 كوداً بالترتيب المطلوب.
- [ ] حفظ prefs: عدّل `store.set({displayCurrency:'USD'})` من Console ثم reload → يرجع كما عدّل (وإن كان تالفاً يعود للافتراضي).

### P1 — الهوية + i18n + التنقل
- [ ] الصفحة تفتح بلا أخطاء Console (تنقل عبر أي سيرفر ثابت — ES modules لا تعمل file://).
- [ ] تبديل `document.documentElement.dataset.theme` يدوياً (dark/light) يبدّل كل الواجهة.
- [ ] اللغة ar: `<html lang="ar" dir="rtl">` والتنقل من اليمين أسفل الشاشة.
- [ ] تبديل `store.set({lang:'en'})` → dir يصبح ltr والنصوص تبدل فورياً.
- [ ] الأرقام دائماً بخط Inter (فئة .num أو توليد تلقائي).
- [ ] التنقل: الـ 5 تبويبات تعمل بالفأرة واللمس والكيبورد؛ Tab/Enter يعملان على الروابط.
- [ ] Back/Forward للمتصفح يحرّك الصفحة، والتبويب النشط يتزامن مع aria-current="page".
- [ ] ≥1024px: التنقل يصبح Sidebar ثابت والمحتوى يبدأ بأول line (بلا تداخل مع Topbar).
- [ ] أهداف لمس ≥ 44px في كل روابط التنقل.
- [ ] skip-link يعمل عند Tab الأول ويقول "تخطَّ إلى المحتوى".
- [ ] لا حروف تحكّم ظاهرة نصاً؛ لا رموز مكررة "ج.م ج.م".

### كيفية التجربة فوراً
1. شغّل سيرفر ثابت (Live Server أو `python -m http.server 8080`).
2. افتح `http://localhost:8080/#/home`.
3. نفّذ checklist أعلاه صفحةً صفحة: #/converter #/jewelry #/alerts #/chart #/timemachine #/cbe #/settings #/more.
