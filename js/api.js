/**
 * api.js — طبقة المصادر — Task 2.1
 * مصادر بدون مفاتيح: gold-api (أونصة USD) + frankfurter (عملات) + CBE (مصري)
 * + open.er-api كامل تعبئة فجوات للعملات غير المدعومة في ECB (SAR/EGP/AED…)
 * + stooq CSV للتاريخ المعدني (مرّن: بلا كورس → وضع تقريبي).
 * موحّد: timeout 10s + retry بـ Backoff أُسّي عند 429/فشل شبكة (1s→2s→4s، حد 3).
 */

const GOLD_API = 'https://api.gold-api.com/price';
const FRANK_V2 = 'https://api.frankfurter.dev/v2';
const GAP_FILLER = 'https://open.er-api.com/v6/latest/USD';
const STOOQ = 'https://stooq.com/q/d/l/';

const DEFAULT_TIMEOUT = 10000;
const RETRIES = 3;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** جلب JSON مع timeout + backoff أُسّي عند 429/شبكة */
export async function jget(url, { timeout = DEFAULT_TIMEOUT, retries = RETRIES, as = 'json' } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1)); // 1s → 2s → 4s
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json, text/csv,*/*' } });
      clearTimeout(tm);
      if (res.status === 429) { lastErr = new Error('rate-limited'); continue; }
      if (!res.ok) {
        // 404/5xx لا تعيد المحاولة (نفس النتيجة) — إلا 5xx لمرة
        if (res.status === 404) return null;
        if (res.status >= 500 && attempt < retries - 1) { lastErr = new Error('server ' + res.status); continue; }
        throw new Error('HTTP ' + res.status);
      }
      const text = await res.text();
      if (as === 'text') return text;
      return JSON.parse(text);
    } catch (e) {
      clearTimeout(tm);
      if (e.name === 'AbortError') lastErr = new Error('timeout');
      else lastErr = e;
      if (attempt === retries - 1) throw lastErr;
    }
  }
  throw lastErr || new Error('fetch failed');
}

/* ---------- المعادن والأصول ---------- */

/** سعر أصل واحد بالدولار للوحدة (أونصة/رطل/عملة) */
export async function fetchAsset(code) {
  const data = await jget(`${GOLD_API}/${encodeURIComponent(code)}`);
  if (!data || !Number.isFinite(data.price)) return null;
  return { code, usd: Number(data.price) };
}

/** كل الأصول المعروضة — { XAU: {usd}, ... } (المفرد الفاشل يُهمل بصمت) */
export async function fetchAllAssets(codes) {
  const results = await Promise.allSettled(codes.map(fetchAsset));
  const out = {};
  results.forEach(r => { if (r.status === 'fulfilled' && r.value) out[r.value.code] = { usd: r.value.usd }; });
  if (!Object.keys(out).length) throw new Error('no-metal-prices');
  return out;
}

/* ---------- العملات ---------- */

/**
 * خريطة usdRates: { CODE: rate } حيث 1 USD = rate من العملة.
 * أساسي: frankfurter (ECB). تعبئة فجوات لغير مدعومة ECB عبر open.er-api.
 */
export async function fetchUsdRates(codes) {
  const want = codes.filter(c => c !== 'USD');
  const out = { USD: 1 };
  let any = false;

  if (want.length) {
    try {
      const f = await jget(`${FRANK_V2}/rates?base=USD&quotes=${want.join(',')}`);
      const rates = f && f.rates ? f.rates : {};
      want.forEach(c => { if (Number.isFinite(rates[c]) && rates[c] > 0) { out[c] = rates[c]; any = true; } });
    } catch { /* نعتمد على المُكمل تماماً */ }
  }

  const missing = want.filter(c => !(c in out));
  if (missing.length) {
    try {
      const g = await jget(GAP_FILLER); // { result:'success', rates:{...} }
      const rates = g && g.rates ? g.rates : {};
      missing.forEach(c => { if (Number.isFinite(rates[c]) && rates[c] > 0) { out[c] = rates[c]; any = true; } });
    } catch { /* لا مزود متاح */ }
  }

  if (!any && want.length) throw new Error('no-fx-sources');
  return out;
}

/** سجل تاريخي يومي USD→CODEs من frankfurter — { '2024-01-02': {EUR: 0.9, ...} } */
export async function fetchHistory(start, end, codes) {
  const want = codes.filter(c => !['USD'].includes(c));
  if (!want.length) return { start, end, rates: {} };
  let data = null;
  try {
    data = await jget(`${FRANK_V2}/${start}..${end}?base=USD&quotes=${want.join(',')}`);
  } catch { return null; }
  const rates = data && data.rates ? data.rates : {};
  return { start, end, rates };
}

/** CBE (البنك المركزي المصري): { rates: { EGP: 47.5, ... } } أو null لو غير متاح */
export async function fetchCBERates() {
  try {
    const data = await jget(`${FRANK_V2}/providers/cbe/rates?base=USD`, { retries: 2 });
    return data && data.rates ? data.rates : null;
  } catch { return null; }
}

/* ---------- التاريخ المعدني (stooq CSV — بدون مفاتيح) ---------- */

const STOOQ_SYMBOLS = { XAU: 'xauusd', XAG: 'xagusd', XPT: 'xptusd', XPD: 'xpdusd', HG: 'hgusd', BTC: 'btcusd', ETH: 'ethusd' };

/** CSV يومي: Date Open High Low Close — { date: close } للفترة المطلوبة */
export async function fetchAssetHistory(code, startISO, endISO) {
  const sym = STOOQ_SYMBOLS[code];
  if (!sym) return null;
  let csv = '';
  try {
    csv = await jget(`${STOOQ}?s=${sym}&d1=${startISO.replace(/-/g, '')}&d2=${endISO.replace(/-/g, '')}&i=d`, { as: 'text', retries: 2 });
  } catch { return null; }
  if (!csv || !/^Date/i.test(csv)) return null;
  const out = {};
  for (const line of csv.trim().split('\n').slice(1)) {
    const [date, , , , close] = line.split(',');
    if (date && close && date >= startISO && date <= endISO) out[date] = Number(close);
  }
  return Object.keys(out).length ? out : null;
}
