/**
 * seo.js — SEO قوي لمحركات البحث وأدوات الذكاء الاصطناعي — Phase 9
 * 1) meta + OpenGraph متغيرة لكل مسار + canonical.
 * 2) JSON-LD ثابت: Organization + WebSite + WebApplication + FAQPage.
 * 3) JSON-LD ديناميكي: ItemList بآخر الأسعار (تحديث مع كل دورة polling).
 */

import { get, subscribe } from './store.js';
import { t } from './i18n.js';
import { ASSET_MAP, pricePerGramUSD, TROY_OZ_GRAMS } from './pools.js';
import { formatMoney } from './format.js';

const ROUTES = {
  home: 'home', converter: 'converter', jewelry: 'jewelry', alerts: 'alerts',
  chart: 'chart', timemachine: 'timemachine', cbe: 'cbe', settings: 'settings', more: 'more',
};

/** تطبيق meta المسار الحالي (يُستدعى من الراوتر بعد كل render) */
let currentRoute = 'home';

export function applyRouteMeta(name) {
  const key = ROUTES[name] || 'home';
  currentRoute = key;
  const title = t(`meta.${key}.title`);
  const desc = t(`meta.${key}.desc`);
  document.title = title;

  setMeta('name', 'description', desc);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', location.href.split('#')[0] + '#/' + key);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', desc);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }
  canonical.href = location.origin + location.pathname;
}

function setMeta(attr, key, content) {
  let m = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!m) {
    m = document.createElement('meta');
    m.setAttribute(attr, key);
    document.head.append(m);
  }
  m.setAttribute('content', content);
}

/* ---------- JSON-LD ---------- */
function injectLd(id, obj) {
  let s = document.head.querySelector(`script[data-ld="${id}"]`);
  if (!s) {
    s = document.createElement('script');
    s.type = 'application/ld+json';
    s.dataset.ld = id;
    document.head.append(s);
  }
  s.textContent = JSON.stringify(obj, null, 0);
}

/** الهيكل الثابت — يُستدعى مرة عند الإقلاع */
export function init() {
  const lang = get('lang') || 'ar';
  const base = location.origin + location.pathname;

  injectLd('org', {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': base + '#org',
        name: 'Pricess Money',
        logo: { '@type': 'ImageObject', url: base + 'assets/icons/icon-512.png' },
        url: base,
      },
      {
        '@type': 'WebSite',
        '@id': base + '#site',
        url: base,
        name: 'Pricess Money',
        inLanguage: lang,
        publisher: { '@id': base + '#org' },
      },
      {
        '@type': 'WebApplication',
        '@id': base + '#app',
        name: 'Pricess Money',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        url: base,
        inLanguage: ['ar', 'en'],
        description: t('meta.home.desc'),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'Live precious metal prices (gold, silver, platinum, palladium, copper)',
          'Live crypto prices (BTC, ETH)',
          '40+ world & Middle East currency exchange rates vs USD',
          'Jewelry price calculator with karats, making charges and VAT',
          'Per-gram price alerts with in-app notifications',
          'Interactive historical charts',
          'Central Bank of Egypt official rates comparison',
          'Full Arabic RTL and English support, installable PWA',
        ],
        publisher: { '@id': base + '#org' },
      },
      {
        '@type': 'FAQPage',
        '@id': base + '#faq',
        mainEntity: lang === 'ar' ? faqAr(base) : faqEn(base),
      },
    ],
  });
}

function faqAr(base) {
  return [
    ['ما هو Pricess Money؟', 'منصة ويب مجانية تعرض أسعاراً لحظية للمعادن النفيسة (ذهب، فضة، بلاتين، بالاديوم، نحاس) وأسعار صرف أكثر من 40 عملة عالمية وعربية مقابل الدولار، مع حاسبة مجوهرات وتنبيهات أسعار.'],
    ['كم مرة تتحدث الأسعار؟', 'تتحدث الأسعار تلقائياً كل 30 ثانية أثناء فتح التطبيق، وتتوقف ذكياً عند إخفاء التبويب لتوفير الاستهلاك.'],
    ['كيف أحسب سعر جرام الذهب بعيار معين؟', 'من حاسبة المجوهرات: أدخل الوزن بالجرام واختر العيار (24 أو 22 أو 21 أو 18) وأضف المصنعية والضريبة، فتحصل على تفصيل كامل بالسعر اللحظي.'],
    ['هل أحتاج حساباً أو مفتاح API؟', 'لا — كل شيء يعمل مباشرة في المتصفح دون تسجيل، ويمكن تثبيته كتطبيق على الهاتف.'],
    ['ما مصادر الأسعار؟', 'أسعار المعادن من gold-api والعملات من Frankfurter وأسعار البنك المركزي المصري من مزوده الرسمي عبر Frankfurter — مصادر عامة موثوقة.'],
  ].map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  }));
}
function faqEn(base) {
  return [
    ['What is Pricess Money?', 'A free web platform showing live prices for precious metals (gold, silver, platinum, palladium, copper) and 40+ world and Arab currencies vs the US dollar, with a jewelry calculator and price alerts.'],
    ['How often are prices updated?', 'Prices refresh automatically every 30 seconds while the app is open, and polling pauses smartly when the tab is hidden.'],
    ['How do I calculate the price of one gram of gold by karat?', 'Use the jewelry calculator: enter the weight in grams, pick the karat (24, 22, 21 or 18), add making charges and VAT — you get a full live breakdown.'],
    ['Do I need an account or API key?', 'No — everything works right in the browser with no sign-up, and it can be installed as a phone app.'],
    ['What are the data sources?', 'Metal prices from gold-api, currency rates from Frankfurter, and Central Bank of Egypt official rates via its provider — reliable public sources.'],
  ].map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  }));
}

/** ItemList بالأسعار الحية — يُحدَّث مع كل دورة polling (قابل للزحف لآخر قيمة) */
export function updatePriceLd() {
  const prices = get('prices') || {};
  const entries = Object.keys(prices)
    .filter(c => ASSET_MAP.has(c) && Number.isFinite(prices[c]?.usd))
    .map(code => {
      const a = ASSET_MAP.get(code);
      const unit = a.code === 'HG' ? 'per lb' : a.unit === 'coin' ? 'per coin' : 'per troy ounce';
      return {
        '@type': 'ListItem',
        position: 0,
        item: {
          '@type': 'Product',
          name: `${a.en} (${code})`,
          description: `${a.en} live price in USD ${unit}`,
          additionalProperty: {
            '@type': 'PropertyValue',
            name: 'priceUSD',
            value: formatMoney(prices[code].usd, { decimals: 2 }),
          },
        },
      };
    })
    .map((e, i) => ({ ...e, position: i + 1 }));

  if (!entries.length) return;
  injectLd('prices', {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Pricess Money — live asset prices in USD',
    numberOfItems: entries.length,
    dateModified: new Date(get('lastUpdate') || Date.now()).toISOString(),
    itemListElement: entries,
  });
}

// تبديل اللغة → meta/JSON-LD باللغة الجديدة فوراً (بدون إعادة رسم الصفحة)
subscribe((changed) => {
  if (changed.includes('lang')) {
    applyRouteMeta(currentRoute);
    init(); // FAQPage + inLanguage بلغة جديدة
  }
  if (changed.includes('lastUpdate')) updatePriceLd();
});
