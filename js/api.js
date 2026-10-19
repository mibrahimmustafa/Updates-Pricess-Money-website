/**
 * api.js — طبقة المصادر — Task 2.1
 * Endpoints مؤكدة حية (تم اختبارها):
 *  - gold-api : /price/{SYMBOL} → {price, symbol, updatedAt}
 *  - rates    : /v2/rates?base=USD&quotes=A,B → [{date, base, quote, rate}]
 *  - history  : /v1/{start}..{end}?base=USD&quotes=A,B → {rates:{date:{CUR:v}}}
 *  - CBE      : /v2/providers/cbe/rates?base=USD → [{date, base, quote, rate}]
 * قواعد: timeout 10s + إعادة محاولة Backoff أُسّي + احترام كاش الـ API (~25s محلياً).
 */

const TIMEOUT = 10000;
const RETRIES = 2;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function backoff(i) { return Math.min(1000 * Math.pow(2, i), 8000); }

/** جلب JSON بحد زمني وإعادة محاولة — يرمي عند الفشل النهائي */
export async function fetchJSON(url, { timeout = TIMEOUT, retries = RETRIES } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort('timeout'), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(to);
      if (res.status === 429 || res.status >= 500) throw Object.assign(new Error(`HTTP ${res.status}`), { retryable: true });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(to);
      lastErr = e;
      if (e?.name === 'AbortError') break;      // timeout → لا قيمة من إعادة المحاولة فوراً
      if (i < retries) await wait(backoff(i));
    }
  }
  throw lastErr ?? new Error('network');
}

/* ---------- المعادن والأصول (سعر بالدولار/وحدة أصلي) ---------- */
const goldCache = new Map(); // code → {data, ts}
const GOLD_CACHE_MS = 25000; // احترام كاش الـ API ~30 ثانية بهامش

export async function getAssetPrice(code) {
  const hit = goldCache.get(code);
  if (hit && Date.now() - hit.ts < GOLD_CACHE_MS) return hit.data;
  const d = await fetchJSON(`https://api.gold-api.com/price/${encodeURIComponent(code)}`);
  const data = { code, price: Number(d.price), name: d.name, updatedAt: d.updatedAt || '' };
  if (!Number.isFinite(data.price) || data.price <= 0) throw new Error('bad price');
  goldCache.set(code, { data, ts: Date.now() });
  return data;
}

/** كل الأصول الظاهرة — one shot، لا يسقط عند فشل رمز واحد */
export async function getAssetPrices(codes) {
  const settled = await Promise.allSettled(codes.map(c => getAssetPrice(c)));
  const prices = {}, failed = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') prices[codes[i]] = { usd: r.value.price, updatedAt: r.value.updatedAt };
    else failed.push(codes[i]);
  });
  if (Object.keys(prices).length === 0) throw new Error('all assets failed');
  return { prices, failed };
}

/* ---------- أسعار الصرف اللحظية ---------- */
export async function getRates(quotes) {
  const list = quotes.filter(q => q && q !== 'USD').join(',');
  if (!list) return { USD: 1 };
  // المسار الأساسي (v2 — مصفوفة) مع fallback إلى v1 latest (كائن)
  try {
    const arr = await fetchJSON(`https://api.frankfurter.dev/v2/rates?base=USD&quotes=${list}`);
    const map = { USD: 1 };
    for (const row of Array.isArray(arr) ? arr : []) {
      if (row?.quote && Number.isFinite(Number(row.rate))) map[row.quote] = Number(row.rate);
    }
    if (Object.keys(map).length > 1) return map;
    throw new Error('empty v2 rates');
  } catch {
    const d = await fetchJSON(`https://api.frankfurter.dev/v1/latest?base=USD&quotes=${list}`);
    const map = { USD: 1 };
    const rates = d?.rates || {};
    for (const [k, v] of Object.entries(rates)) if (Number.isFinite(Number(v))) map[k] = Number(v);
    if (Object.keys(map).length === 1) throw new Error('no rates');
    return map;
  }
}

/* ---------- سجل تاريخي للعملات ---------- */
/** يعيد [{date, values:{CUR:rate}}] مرتبة تصاعدياً */
export async function getHistory(startISO, endISO, quotes) {
  const list = quotes.filter(q => q && q !== 'USD').join(',');
  const url = list
    ? `https://api.frankfurter.dev/v1/${startISO}..${endISO}?base=USD&quotes=${list}`
    : `https://api.frankfurter.dev/v1/${startISO}..${endISO}?base=USD`;
  const d = await fetchJSON(url, { retries: 1 });
  const rates = d?.rates || {};
  return Object.keys(rates).sort()
    .map(date => ({ date, values: rates[date] }));
}

/* ---------- البنك المركزي المصري ---------- */
/** يعيد {quote: {rate, date}} */
export async function getCBERates() {
  const arr = await fetchJSON('https://api.frankfurter.dev/v2/providers/cbe/rates?base=USD', { retries: 1 });
  const map = {};
  for (const row of Array.isArray(arr) ? arr : []) {
    if (row?.quote && Number.isFinite(Number(row.rate))) {
      map[row.quote] = { rate: Number(row.rate), date: row.date || '' };
    }
  }
  if (Object.keys(map).length === 0) throw new Error('CBE empty');
  return map;
}
