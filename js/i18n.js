/**
 * i18n.js — قاموس ar/en بدون مكتبات — Task 1.2 (النسخة الكاملة لكل المراحل)
 * قواعد حرجة:
 *  - أي رقم/كود لاتيني داخل نص: يمر عبر format.js (عزل LRI…PDI) — لا concat ضمن RTL.
 *  - dir/lang يتغيران فورياً عند تبديل اللغة.
 *  - ممنوع أي حروف تحكّم مكتوبة يدوياً في النصوص المصدرية.
 */

import { get, set, subscribe } from './store.js';

export const MESSAGES = {
  ar: {
    /* أساسيات */
    'app.name': 'Pricess Money',
    'app.tagline': 'أسعار المعادن والعملات — لحظة بلحظة',
    'a11y.skip': 'تخطَّ إلى المحتوى الرئيسي',
    'a11y.nav': 'التنقل الرئيسي',
    'a11y.live': 'حالة تحديث الأسعار',
    'a11y.themeToggle': 'تبديل المظهر',

    'nav.home': 'الأسعار',
    'nav.converter': 'المحوّل',
    'nav.jewelry': 'المجوهرات',
    'nav.settings': 'الإعدادات',
    'nav.more': 'المزيد',

    /* UI مشتركة */
    'ui.retry': 'إعادة المحاولة',
    'ui.refresh': 'تحديث',
    'ui.copied': 'تم النسخ',
    'ui.offline': 'أنت أوفلاين — آخر أسعار متاحة',
    'ui.updated': 'آخر تحدّث',
    'ui.live': 'مباشر',
    'ui.loading': 'جارٍ التحميل…',
    'ui.noData': 'لا توجد بيانات بعد',
    'ui.showAll': 'عرض الكل',
    'ui.showLess': 'إظهار أقل',
    'ui.perGram': 'للجرام',
    'ui.perOunce': 'للأونصة',
    'ui.perCoin': 'لكل وحدة',
    'ui.latency': 'زمن الاستجابة',
    'ui.usdPerOz': 'دولار / أونصة',
    'ui.usdPerLb': 'دولار / رطل',
    'ui.usdPerCoin': 'دولار / عملة',
    'ui.saved': 'تم الحفظ',
    'ui.done': 'تم',
    'ui.oz': 'أونصة',
    'ui.g': 'جرام',

    /* الرئيسية */
    'home.title': 'أسعار لحظية',
    'home.fxTitle': 'أسعار الصرف مقابل الدولار',
    'home.assetsTitle': 'المعادن والأصول',
    'home.karatBreakdown': 'تفصيل عيارات الذهب',
    'home.karatNote': 'السعر لكل جرام بالعملة الافتراضية حسب نقاوة العيار',
    'home.tapToCopy': 'اضغط أي قيمة لنسخها',

    /* الإعدادات */
    'settings.title': 'الإعدادات',
    'settings.lang': 'اللغة',
    'settings.theme': 'المظهر',
    'theme.system': 'النظام',
    'theme.light': 'فاتح',
    'theme.dark': 'داكن',
    'settings.displayCurrency': 'العملة الافتراضية',
    'settings.currencies': 'العملات المعروضة',
    'settings.assets': 'الأصول المعروضة',
    'settings.search': 'ابحث في العملات…',
    'settings.filterAll': 'الكل',
    'settings.counter': '{n} من {total}',
    'preset.default': 'استعادة الافتراضي',
    'preset.gulf': 'الخليج',
    'preset.mena': 'الشرق الأوسط',
    'preset.major': 'كبرى العالم',
    'settings.minOne': 'لا يمكن إفراغ القائمة — يلزم عملة واحدة على الأقل',
    'settings.minOneAsset': 'يلزم أصل واحد على الأقل',
    'settings.resetPrefs': 'مسح كل التفضيلات',
    'settings.resetDone': 'أُعيدت كل الإعدادات للافتراضي',
    'settings.displayHint': 'تُستخدم في حاسبة المجوهرات وتفصيل العيارات',

    /* المحوّل */
    'conv.title': 'المحوّل',
    'conv.from': 'من (أصل واحد)',
    'conv.amount': 'القيمة',
    'conv.unit': 'الوحدة',
    'conv.quick': 'قوالب سريعة',
    'conv.results': 'النتائج',
    'conv.metals': 'معادن وأصول',
    'conv.currencies': 'عملات',
    'conv.usdValue': 'القيمة بالدولار',
    'conv.allCurrencies': 'كل العملات الظاهرة',
    'conv.grampow': 'لكل جرام',

    /* المجوهرات */
    'jw.title': 'حاسبة المجوهرات',
    'jw.inputs': 'بيانات القطعة',
    'jw.weight': 'الوزن (جم)',
    'jw.karat': 'العيار',
    'jw.making': 'المصنعية لكل جرام',
    'jw.vat': 'ضريبة القيمة المضافة 14%',
    'jw.old': 'المبشَّت (مبادل قديم)',
    'jw.oldHint': 'قيمة ذهب قديم تُخصم من الإجمالي بسعر السوق',
    'jw.oldWeight': 'وزن المبشَّت (جم)',
    'jw.oldKarat': 'عيار المبشَّت',
    'jw.breakdown': 'التفصيل',
    'jw.metal': 'سعر المعدن',
    'jw.makingLine': 'المصنعية',
    'jw.vatLine': 'الضريبة (14%)',
    'jw.oldLine': 'قيمة المبشَّت (خصم)',
    'jw.total': 'الإجمالي',
    'jw.currency': 'عرض النتيجة بـ',
    'jw.note': 'محسوبة بسعر السوق اللحظي — رقم إرشادي قبل الشراء',
    'jw.gramPrice': 'سعر الجرم السوقي',

    /* التنبيهات */
    'al.title': 'تنبيهات الأسعار',
    'al.create': 'إنشاء تنبيه',
    'al.asset': 'المعدن',
    'al.currency': 'العملة',
    'al.target': 'السعر المستهدف (للجرام)',
    'al.above': 'فوق',
    'al.below': 'تحت',
    'al.add': 'إضافة التنبيه',
    'al.list': 'تنبيهاتي',
    'al.none': 'لا توجد تنبيهات بعد — أنشئ أول تنبيه لك',
    'al.noneHint': 'سيصلك إشعار فور بلوغ السعر المستهدف',
    'al.fired': 'تم التفعيل',
    'al.rearm': 'سيُعاد تسليحه عند الابتعاد عن الحد',
    'al.delete': 'حذف',
    'al.now': 'السعر الآن',
    'al.target': 'المستهدف',
    'al.closeToFire': 'الأقرب للتفعيل',
    'al.invalidTarget': 'أدخل سعراً مستهدفاً صحيحاً أكبر من صفر',

    /* المخططات */
    'ch.title': 'المخططات التاريخية',
    'ch.asset': 'الأصل',
    'ch.currency': 'عملة العرض',
    'ch.period': 'الفترة',
    'per.1W': 'أسبوع',
    'per.1M': 'شهر',
    'per.3M': '3 أشهر',
    'per.6M': '6 أشهر',
    'per.1Y': 'سنة',
    'per.MAX': 'الأقصى',
    'ch.change': 'التغير',
    'ch.high': 'الأعلى',
    'ch.low': 'الأدنى',
    'ch.localNote': 'سجل المعادن يُبنى محلياً أثناء استخدام التطبيق — كلما أطلت الاستخدام اكتمل المنحنى',
    'ch.nodata': 'لا توجد نقاط تاريخية كافية بعد',
    'ch.nodataHint': 'سنعود بالبيانات بعد بضع دقائق من التشغيل، أو جرّب عملة (سجلها متاح تاريخياً)',
    'ch.points': 'نقطة',
    'ch.span': 'التغطية',
    'ch.spanM': 'دقيقة',
    'ch.spanH': 'ساعة',
    'ch.spanD': 'يوم',

    /* آلة الزمن */
    'tm.title': 'آلة الزمن',
    'tm.subtitle': 'قيمة {w} جم ذهب عيار {k} بين 2015 واليوم',
    'tm.weight': 'الوزن (جم)',
    'tm.karat': 'العيار',
    'tm.currency': 'العملة',
    'tm.then': 'في 2015',
    'tm.now': 'اليوم',
    'tm.growth': 'نمو القيمة',
    'tm.note': 'يستند 2015 إلى متوسط سعر الذهب المعروف (~$1,160/أونصة) وسعر صرف تاريخي — قيم إرشادية',
    'tm.pegged': 'عملة مرتبطة بالدولار — سعر ثابت تاريخياً',
    'tm.anchor': 'سعر رسمي معروف من 2015',
    'tm.missing': 'لا يتوفر سعر تاريخي 2015 لهذه العملة — يُعرض مقابل الدولار',
    'tm.gram': 'سعر الجرم',
    'tm.total': 'قيمة القطعة',

    /* CBE */
    'cbe.title': 'أسعار البنك المركزي المصري',
    'cbe.official': 'رسمي (CBE)',
    'cbe.market': 'السوق الحي',
    'cbe.diff': 'الفرق',
    'cbe.diffPct': 'الفرق %',
    'cbe.updatedAt': 'تحديث رسمي بتاريخ {date}',
    'cbe.unavailable': 'بيانات البنك المركزي غير متاحة حالياً',
    'cbe.note': 'الفرق = السوق الحي − السعر الرسمي. انحراف كبير قد يعني فجوة تسعير',
    'cbe.search': 'ابحث في العملات…',
    'cbe.deviation': 'انحراف',

    /* المزيد */
    'more.hint': 'شاشات إضافية',
    'stub.title': 'قيد البناء',
    'stub.phase': 'هذه الشاشة تُبنى في المرحلة {n} من خطة العمل.',

    /* Meta SEO لكل مسار */
    'meta.home.title': 'Pricess Money — أسعار الذهب والفضة والعملات لحظياً',
    'meta.home.desc': 'أسعار لحظية للذهب والفضة والبلاتين وبيتكوين وأكثر من 40 عملة عالمية مقابل الدولار، مع حاسبة مجوهرات وتنبيهات أسعار ومخططات تاريخية — مجاناً وفي متصفحك.',
    'meta.converter.title': 'المحوّل — حوّل المعادن والعملات فورياً | Pricess Money',
    'meta.converter.desc': 'حول الذهب والفضة وأي عملة عالمية إلى كل العملات العربية والعالمية بأسعار لحظية موثوقة.',
    'meta.jewelry.title': 'حاسبة المجوهرات — سعر الذهب بالعيارات | Pricess Money',
    'meta.jewelry.desc': 'احسب سعر أي قطعة ذهب: عيار 24 و22 و21 و18، مع المصنعية وضريبة القيمة المضافة وخصم المبشَّت.',
    'meta.alerts.title': 'تنبيهات الأسعار — بلّغني عند السعر | Pricess Money',
    'meta.alerts.desc': 'أنشئ تنبيهات لسعر جرام الذهب والفضة بأي عملة، وتلقى إشعاراً فور بلوغ الهدف.',
    'meta.chart.title': 'المخططات التاريخية — تطور الأسعار | Pricess Money',
    'meta.chart.desc': 'خطوط بيانية تفاعلية لأسعار المعادن والعملات عبر أسبوع وشهر وسنة وأكثر.',
    'meta.timemachine.title': 'آلة الزمن — قيمة الذهب في 2015 مقابل اليوم',
    'meta.timemachine.desc': 'قارن قيمة أي وزن ذهب بين 2015 واليوم بأي عملة ظاهرة، مع نسبة النمو.',
    'meta.cbe.title': 'سعر الدولار الرسمي (CBE) مقابل السوق | Pricess Money',
    'meta.cbe.desc': 'قارن سعر البنك المركزي المصري الرسمي بسعر السوق الحي لكل عملة مدعومة، مع تلوين الانحراف.',
    'meta.settings.title': 'الإعدادات — اللغة والمظهر والعملات | Pricess Money',
    'meta.settings.desc': 'خصّص اللغة والمظهر والعملات والأصول المعروضة — كل شيء ينعكس فوراً.',
    'meta.more.title': 'المزيد — كل الشاشات | Pricess Money',
    'meta.more.desc': 'المخططات، التنبيهات، حاسبة المجوهرات، آلة الزمن، وأسعار البنك المركزي — كلها في مكان واحد.',
  },

  en: {
    'app.name': 'Pricess Money',
    'app.tagline': 'Metals & currency rates — live',
    'a11y.skip': 'Skip to main content',
    'a11y.nav': 'Main navigation',
    'a11y.live': 'Price update status',
    'a11y.themeToggle': 'Toggle appearance',

    'nav.home': 'Prices',
    'nav.converter': 'Converter',
    'nav.jewelry': 'Jewelry',
    'nav.settings': 'Settings',
    'nav.more': 'More',

    'ui.retry': 'Retry',
    'ui.refresh': 'Refresh',
    'ui.copied': 'Copied',
    'ui.offline': 'You are offline — showing last available rates',
    'ui.updated': 'Last update',
    'ui.live': 'Live',
    'ui.loading': 'Loading…',
    'ui.noData': 'No data yet',
    'ui.showAll': 'Show all',
    'ui.showLess': 'Show less',
    'ui.perGram': 'per gram',
    'ui.perOunce': 'per ounce',
    'ui.perCoin': 'per coin',
    'ui.latency': 'Latency',
    'ui.usdPerOz': 'USD / oz',
    'ui.usdPerLb': 'USD / lb',
    'ui.usdPerCoin': 'USD / coin',
    'ui.saved': 'Saved',
    'ui.done': 'Done',
    'ui.oz': 'ounce',
    'ui.g': 'gram',

    'home.title': 'Live Rates',
    'home.fxTitle': 'FX rates vs US Dollar',
    'home.assetsTitle': 'Metals & Assets',
    'home.karatBreakdown': 'Gold karat breakdown',
    'home.karatNote': 'Price per gram in your display currency, by karat purity',
    'home.tapToCopy': 'Tap any value to copy',

    'settings.title': 'Settings',
    'settings.lang': 'Language',
    'settings.theme': 'Appearance',
    'theme.system': 'System',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'settings.displayCurrency': 'Default currency',
    'settings.currencies': 'Displayed currencies',
    'settings.assets': 'Displayed assets',
    'settings.search': 'Search currencies…',
    'settings.filterAll': 'All',
    'settings.counter': '{n} of {total}',
    'preset.default': 'Restore defaults',
    'preset.gulf': 'Gulf',
    'preset.mena': 'Middle East',
    'preset.major': 'Major',
    'settings.minOne': 'List cannot be empty — at least one currency required',
    'settings.minOneAsset': 'At least one asset required',
    'settings.resetPrefs': 'Reset all preferences',
    'settings.resetDone': 'All preferences restored to defaults',
    'settings.displayHint': 'Used in the jewelry calculator and karat breakdown',

    'conv.title': 'Converter',
    'conv.from': 'From (single source)',
    'conv.amount': 'Amount',
    'conv.unit': 'Unit',
    'conv.quick': 'Quick templates',
    'conv.results': 'Results',
    'conv.metals': 'Metals & assets',
    'conv.currencies': 'Currencies',
    'conv.usdValue': 'Value in USD',
    'conv.allCurrencies': 'All displayed currencies',
    'conv.grampow': 'per gram',

    'jw.title': 'Jewelry Calculator',
    'jw.inputs': 'Piece details',
    'jw.weight': 'Weight (g)',
    'jw.karat': 'Karat',
    'jw.making': 'Making charges per gram',
    'jw.vat': 'VAT 14%',
    'jw.old': 'Old gold trade-in',
    'jw.oldHint': 'Old gold value deducted at market price',
    'jw.oldWeight': 'Old gold weight (g)',
    'jw.oldKarat': 'Old gold karat',
    'jw.breakdown': 'Breakdown',
    'jw.metal': 'Metal cost',
    'jw.makingLine': 'Making charges',
    'jw.vatLine': 'VAT (14%)',
    'jw.oldLine': 'Trade-in credit (−)',
    'jw.total': 'Total',
    'jw.currency': 'Show result in',
    'jw.note': 'Live market rates — indicative figure before purchase',
    'jw.gramPrice': 'Market gram price',

    'al.title': 'Price Alerts',
    'al.create': 'Create alert',
    'al.asset': 'Metal',
    'al.currency': 'Currency',
    'al.target': 'Target price (per gram)',
    'al.above': 'Above',
    'al.below': 'Below',
    'al.add': 'Add alert',
    'al.list': 'My alerts',
    'al.none': 'No alerts yet — create your first one',
    'al.noneHint': 'You will get a notification the moment the target is hit',
    'al.fired': 'Triggered',
    'al.rearm': 'Re-arms once price moves away',
    'al.delete': 'Delete',
    'al.now': 'Now',
    'al.target': 'Target',
    'al.closeToFire': 'Closest to fire',
    'al.invalidTarget': 'Enter a valid target greater than zero',

    'ch.title': 'Historical Charts',
    'ch.asset': 'Asset',
    'ch.currency': 'Display currency',
    'ch.period': 'Period',
    'per.1W': 'Week',
    'per.1M': 'Month',
    'per.3M': '3 months',
    'per.6M': '6 months',
    'per.1Y': 'Year',
    'per.MAX': 'Max',
    'ch.change': 'Change',
    'ch.high': 'High',
    'ch.low': 'Low',
    'ch.localNote': 'Metal history builds locally while you use the app — the curve completes over time',
    'ch.nodata': 'Not enough historical points yet',
    'ch.nodataHint': 'Data accumulates after a few minutes of use — or try a currency (history available)',
    'ch.points': 'points',
    'ch.span': 'Span',
    'ch.spanM': 'min',
    'ch.spanH': 'h',
    'ch.spanD': 'd',

    'tm.title': 'Time Machine',
    'tm.subtitle': 'Value of {w}g of {k} gold: 2015 vs today',
    'tm.weight': 'Weight (g)',
    'tm.karat': 'Karat',
    'tm.currency': 'Currency',
    'tm.then': 'In 2015',
    'tm.now': 'Today',
    'tm.growth': 'Value growth',
    'tm.note': '2015 uses the known average gold price (~$1,160/oz) with historical FX — indicative values',
    'tm.pegged': 'Pegged currency — historically stable rate',
    'tm.anchor': 'Known official 2015 rate',
    'tm.missing': 'No 2015 history for this currency — shown vs USD instead',
    'tm.gram': 'Gram price',
    'tm.total': 'Value of {w}g of {k} gold',

    'cbe.title': 'Central Bank of Egypt Rates',
    'cbe.official': 'Official (CBE)',
    'cbe.market': 'Live market',
    'cbe.diff': 'Difference',
    'cbe.diffPct': 'Diff %',
    'cbe.updatedAt': 'Official update dated {date}',
    'cbe.unavailable': 'Central bank data unavailable right now',
    'cbe.note': 'Difference = live market − official. A large gap may indicate pricing spread',
    'cbe.search': 'Search currencies…',
    'cbe.deviation': 'Deviation',

    'more.hint': 'Additional screens',
    'stub.title': 'Under construction',
    'stub.phase': 'This screen is built in Phase {n} of the plan.',

    'meta.home.title': 'Pricess Money — Live Gold, Silver & Currency Rates',
    'meta.home.desc': 'Live prices for gold, silver, platinum, bitcoin and 40+ world currencies vs USD, with a jewelry calculator, price alerts and historical charts — free, right in your browser.',
    'meta.converter.title': 'Converter — Instant Metals & Currency Conversion | Pricess Money',
    'meta.converter.desc': 'Convert gold, silver or any world currency into Arabic and global currencies at live rates.',
    'meta.jewelry.title': 'Jewelry Calculator — Gold Price by Karat | Pricess Money',
    'meta.jewelry.desc': 'Price any gold piece: 24K, 22K, 21K and 18K, with making charges, VAT and trade-in deduction.',
    'meta.alerts.title': 'Price Alerts — Get Notified | Pricess Money',
    'meta.alerts.desc': 'Create per-gram price alerts for gold and silver in any currency; get notified on target.',
    'meta.chart.title': 'Historical Charts | Pricess Money',
    'meta.chart.desc': 'Interactive line charts for metals and currencies over a week, month, year and more.',
    'meta.timemachine.title': 'Time Machine — Gold Value 2015 vs Today',
    'meta.timemachine.desc': 'Compare the value of any gold weight between 2015 and today in any currency.',
    'meta.cbe.title': 'Official CBE USD Rate vs Live Market | Pricess Money',
    'meta.cbe.desc': 'Compare the Central Bank of Egypt official rate with the live market rate, deviations highlighted.',
    'meta.settings.title': 'Settings — Language, Theme & Currencies | Pricess Money',
    'meta.settings.desc': 'Customize language, appearance, displayed currencies and assets — instant reflection.',
    'meta.more.title': 'More — All Screens | Pricess Money',
    'meta.more.desc': 'Charts, alerts, jewelry calculator, time machine and central bank rates — all in one place.',
  },
};

/** ترجمة بسيطة + باراميتر {name} */
export function t(key, params) {
  const lang = get('lang') || 'ar';
  let s = (MESSAGES[lang] && MESSAGES[lang][key]) ?? (MESSAGES.en[key] ?? key);
  if (params) {
    Object.keys(params).forEach(p => { s = s.replace(`{${p}}`, params[p]); });
  }
  return s;
}

/** يطبق اللغة على [data-i18n] وعلى html lang/dir فورياً */
export function applyI18n() {
  const lang = (get('lang') || 'ar');
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';

  html.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // سمات مترجمة: data-i18n-attr="aria-label:key;placeholder:key"
  html.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(';').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

/** تبديل اللغة فوري + إعادة رسم الراوتر تحدث الرسائل تلقائياً */
export function setLang(lang) {
  if (lang !== 'ar' && lang !== 'en') return;
  set({ lang });
}

/** اشتراك: أي تغيير لغة يطبق فوق كل الصفحة بدون إعادة تحميل */
subscribe((changed) => {
  if (changed.includes('lang')) applyI18n();
});
