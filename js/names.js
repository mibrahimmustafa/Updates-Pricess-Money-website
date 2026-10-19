/** names.js — أسماء/أيقونات مترجمة للأصول والعملات (مشتركة بين الصفحات) */

import { ASSET_MAP, CURRENCY_MAP, flagEmoji } from './pools.js';

export function lang() { return document.documentElement.lang || 'ar'; }

export function assetName(code) {
  const a = ASSET_MAP.get(code);
  const l = lang();
  return a ? (a[l] || a.code) : code;
}

export function assetIcon(code) {
  return ASSET_MAP.get(code)?.icon || '•';
}

export function assetColor(code) {
  return ASSET_MAP.get(code)?.color || 'var(--gold)';
}

export function assetUnitLabel(code) {
  const a = ASSET_MAP.get(code);
  return a?.unit === 'coin' ? 'coin' : a?.unit === 'lb' ? 'lb' : 'oz';
}

export function curName(code) {
  const c = CURRENCY_MAP.get(code);
  const l = lang();
  return c ? (c[l] || c.code) : code;
}

export function curSymbol(code) {
  return CURRENCY_MAP.get(code)?.symbol || code;
}

export function curFlag(code) {
  return flagEmoji(code);
}
