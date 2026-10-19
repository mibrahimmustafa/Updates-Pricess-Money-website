/**
 * pools.js — مصدر الحقيقة الوحيد للبيانات الثابتة (Task 0.2)
 * لو عدّلت هنا: عدّل لا شيء آخر — كل الشاشات تقرأ من هذا الملف فقط.
 */

/** troy ounce بالجرام — ثابت فيزيائي */
export const TROY_OZ_GRAMS = 31.1034768;

/** عيارات الذهب (نسبة النقاوة) */
export const KARATS = {
  '24K': 1.0,
  '22K': 0.9167,
  '21K': 0.875,
  '18K': 0.75,
};

/**
 * الأصول (7) — السعر بالدولار للأونصة (troy oz)
 * precious: هل هو معدن نفيس قابل للتحويل للجرام
 */
export const ASSETS = Object.freeze([
  { code: 'XAU', ar: 'ذهب',      en: 'Gold',     icon: '🥇', color: '#D4A548', precious: true,  unit: 'oz' },
  { code: 'XAG', ar: 'فضة',      en: 'Silver',   icon: '🥈', color: '#B9C1CC', precious: true,  unit: 'oz' },
  { code: 'XPT', ar: 'بلاتين',   en: 'Platinum', icon: '⚪', color: '#8FD6C9', precious: true,  unit: 'oz' },
  { code: 'XPD', ar: 'بالاديوم', en: 'Palladium',icon: '🔘', color: '#9AA6F2', precious: true,  unit: 'oz' },
  { code: 'HG',  ar: 'نحاس',     en: 'Copper',   icon: '🟠', color: '#C97B4A', precious: true,  unit: 'lb' },
  { code: 'BTC', ar: 'بيتكوين',  en: 'Bitcoin',  icon: '₿',  color: '#F7931A', precious: false, unit: 'coin' },
  { code: 'ETH', ar: 'إيثيريوم', en: 'Ethereum', icon: 'Ξ',  color: '#627EEA', precious: false, unit: 'coin' },
]);

/**
 * العملات — القائمة الأصلية في المواصفة (المجموعة "48") تضم فعلياً 51 كوداً؛
 * القائمة أعلاه هي مصدر الحقيقة: كلها مدعومة في Frankfurter.
 * region: major (كبرى العالم) / gulf (الخليج) / mena (الشرق الأوسط)
 */
export const CURRENCIES = Object.freeze([
  // كبرى العالم (35)
  { code: 'USD', ar: 'دولار أمريكي',  en: 'US Dollar',      symbol: '$',    region: 'major' },
  { code: 'EUR', ar: 'يورو',          en: 'Euro',           symbol: '€',    region: 'major' },
  { code: 'GBP', ar: 'جنيه إسترليني', en: 'British Pound',  symbol: '£',    region: 'major' },
  { code: 'JPY', ar: 'ين ياباني',    en: 'Japanese Yen',   symbol: '¥',    region: 'major' },
  { code: 'CHF', ar: 'فرنك سويسري',  en: 'Swiss Franc',    symbol: 'CHF',  region: 'major' },
  { code: 'CAD', ar: 'دولار كندي',    en: 'Canadian Dollar',symbol: 'C$',   region: 'major' },
  { code: 'AUD', ar: 'دولار أسترالي', en: 'Australian Dollar', symbol: 'A$', region: 'major' },
  { code: 'NZD', ar: 'دولار نيوزلندي',en: 'New Zealand Dollar', symbol: 'NZ$', region: 'major' },
  { code: 'CNY', ar: 'يوان صيني',    en: 'Chinese Yuan',   symbol: '¥',    region: 'major' },
  { code: 'SGD', ar: 'دولار سنغافوري',en: 'Singapore Dollar', symbol: 'S$', region: 'major' },
  { code: 'HKD', ar: 'دولار هونغ كونغ',en: 'Hong Kong Dollar', symbol: 'HK$', region: 'major' },
  { code: 'KRW', ar: 'وون كوري',     en: 'Korean Won',     symbol: '₩',    region: 'major' },
  { code: 'INR', ar: 'روبية هندية',  en: 'Indian Rupee',   symbol: '₹',    region: 'major' },
  { code: 'PKR', ar: 'روبية باكستانية',en: 'Pakistani Rupee', symbol: '₨',  region: 'major' },
  { code: 'IDR', ar: 'روبية إندونيسية',en: 'Indonesian Rupiah', symbol: 'Rp', region: 'major' },
  { code: 'MYR', ar: 'رينغيت ماليزي', en: 'Malaysian Ringgit', symbol: 'RM', region: 'major' },
  { code: 'THB', ar: 'بات تايلندي',  en: 'Thai Baht',      symbol: '฿',    region: 'major' },
  { code: 'TWD', ar: 'دولار تايواني', en: 'Taiwan Dollar',  symbol: 'NT$',  region: 'major' },
  { code: 'TRY', ar: 'ليرة تركية',   en: 'Turkish Lira',   symbol: '₺',    region: 'major' },
  { code: 'RUB', ar: 'روبل روسي',    en: 'Russian Ruble',  symbol: '₽',    region: 'major' },
  { code: 'BRL', ar: 'ريال برازيلي', en: 'Brazilian Real', symbol: 'R$',   region: 'major' },
  { code: 'MXN', ar: 'بيزو مكسيكي',  en: 'Mexican Peso',   symbol: 'MX$',  region: 'major' },
  { code: 'ZAR', ar: 'راند جنوب أفريقي', en: 'South African Rand', symbol: 'R', region: 'major' },
  { code: 'NGN', ar: 'نايرا نيجيري',  en: 'Nigerian Naira', symbol: '₦',    region: 'major' },
  { code: 'PLN', ar: 'زلتي بولندي',  en: 'Polish Zloty',   symbol: 'zł',   region: 'major' },
  { code: 'SEK', ar: 'كرونة سويدية', en: 'Swedish Krona',  symbol: 'kr',   region: 'major' },
  { code: 'NOK', ar: 'كرونة نرويجية', en: 'Norwegian Krone', symbol: 'kr',  region: 'major' },
  { code: 'DKK', ar: 'كرونة دنماركية',en: 'Danish Krone',   symbol: 'kr',   region: 'major' },
  { code: 'CZK', ar: 'كورونا تشيكية', en: 'Czech Koruna',   symbol: 'Kč',   region: 'major' },
  { code: 'HUF', ar: 'فورنت مجري',   en: 'Hungarian Forint', symbol: 'Ft',  region: 'major' },
  { code: 'RON', ar: 'ليو روماني',   en: 'Romanian Leu',   symbol: 'lei',  region: 'major' },
  { code: 'ILS', ar: 'شيكل إسرائيلي', en: 'Israeli Shekel', symbol: '₪',    region: 'major' },
  { code: 'RSD', ar: 'دينار صربي',   en: 'Serbian Dinar',  symbol: 'din',  region: 'major' },
  { code: 'UAH', ar: 'هريفنيا أوكرانية', en: 'Ukrainian Hryvnia', symbol: '₴', region: 'major' },
  { code: 'BGN', ar: 'ليف بلغاري',   en: 'Bulgarian Lev',  symbol: 'lev',  region: 'major' },
  // الخليج (6)
  { code: 'SAR', ar: 'ريال سعودي',   en: 'Saudi Riyal',    symbol: 'ر.س',  region: 'gulf' },
  { code: 'AED', ar: 'درهم إماراتي', en: 'UAE Dirham',     symbol: 'د.إ',  region: 'gulf' },
  { code: 'QAR', ar: 'ريال قطري',    en: 'Qatari Riyal',   symbol: 'ر.ق',  region: 'gulf' },
  { code: 'KWD', ar: 'دينار كويتي',  en: 'Kuwaiti Dinar',  symbol: 'د.ك',  region: 'gulf' },
  { code: 'BHD', ar: 'دينار بحريني', en: 'Bahraini Dinar', symbol: 'د.ب',  region: 'gulf' },
  { code: 'OMR', ar: 'ريال عماني',   en: 'Omani Riyal',    symbol: 'ر.ع',  region: 'gulf' },
  // الشرق الأوسط (10)
  { code: 'EGP', ar: 'جنيه مصري',    en: 'Egyptian Pound', symbol: 'ج.م',  region: 'mena' },
  { code: 'JOD', ar: 'دينار أردني',  en: 'Jordanian Dinar', symbol: 'د.أ', region: 'mena' },
  { code: 'IQD', ar: 'دينار عراقي',  en: 'Iraqi Dinar',    symbol: 'د.ع',  region: 'mena' },
  { code: 'LBP', ar: 'ليرة لبنانية', en: 'Lebanese Pound', symbol: 'ل.ل',  region: 'mena' },
  { code: 'YER', ar: 'ريال يمني',    en: 'Yemeni Riyal',   symbol: 'ر.ي',  region: 'mena' },
  { code: 'MAD', ar: 'درهم مغربي',   en: 'Moroccan Dirham', symbol: 'د.م', region: 'mena' },
  { code: 'DZD', ar: 'دينار جزائري', en: 'Algerian Dinar', symbol: 'د.ج',  region: 'mena' },
  { code: 'TND', ar: 'دينار تونسي',  en: 'Tunisian Dinar', symbol: 'د.ت',  region: 'mena' },
  { code: 'LYD', ar: 'دينار ليبي',   en: 'Libyan Dinar',   symbol: 'د.ل',  region: 'mena' },
  { code: 'SDG', ar: 'جنيه سوداني',  en: 'Sudanese Pound', symbol: 'ج.س',  region: 'mena' },
]);

/** الافتراضي المعروض (18) — حرفياً من المواصفة */
export const DEFAULT_CURRENCIES = Object.freeze([
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'TRY',
  'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR',
  'EGP', 'JOD', 'MAD', 'DZD', 'TND', 'LYD',
]);

/** الأصول الافتراضية المعروضة (كلها ظاهرة مبدئياً) */
export const DEFAULT_ASSETS = Object.freeze(['XAU', 'XAG', 'XPT', 'XPD', 'HG', 'BTC', 'ETH']);

// فهارس سريعة lookup
export const ASSET_MAP = new Map(ASSETS.map(a => [a.code, a]));
export const CURRENCY_MAP = new Map(CURRENCIES.map(c => [c.code, c]));

/** علم إيموجي من كود العملة — أول حرفين = كود الدولة ISO-2 (EGP→EG, SAR→SA, TRY→TR…) */
export function flagEmoji(code) {
  const c = String(code || '').toUpperCase();
  if (!CURRENCY_MAP.has(c)) return '';
  return String.fromCodePoint(
    ...[...c.slice(0, 2)].map(ch => 0x1F1E6 + (ch.charCodeAt(0) - 65))
  );
}
