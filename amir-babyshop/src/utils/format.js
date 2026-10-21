/* ═══════════════════════════════════════════════════════════
   FORMAT UTILITIES
   ═══════════════════════════════════════════════════════════ */

let _currency = 'KES';
/* Shape: { KES: { kesPerUnit: 1, ... }, USD: { kesPerUnit: 130, ... }, ... } */
let _rates = {
  KES: { currencyCode: 'KES', kesPerUnit: 1,   symbol: 'KSh', label: 'Kenyan Shilling' },
  USD: { currencyCode: 'USD', kesPerUnit: 130, symbol: '$',   label: 'US Dollar' },
};

/* Hardcoded hints — only for locale + decimals the DB doesn't store.
   Any currency not listed here falls back to en-US / 2 decimals. */
const HARDCODED_META = {
  KES: { locale: 'en-KE', decimals: 0 },
  USD: { locale: 'en-US', decimals: 2 },
  EUR: { locale: 'de-DE', decimals: 2 },
  GBP: { locale: 'en-GB', decimals: 2 },
  TZS: { locale: 'en-TZ', decimals: 0 },
  UGX: { locale: 'en-UG', decimals: 0 },
};

const metaFor = (code) => {
  const r = _rates[code];
  const hardcoded = HARDCODED_META[code] || {};
  return {
    symbol: r?.symbol || code || '?',
    locale: hardcoded.locale || 'en-US',
    decimals: hardcoded.decimals ?? 2,
  };
};

export const setCurrencyRuntime = (currency, rates) => {
  if (rates && typeof rates === 'object') _rates = { ..._rates, ...rates };
  if (currency && (_rates[currency] || HARDCODED_META[currency])) {
    _currency = currency;
  }
};

export const getCurrencyRuntime = () => ({ currency: _currency, rates: _rates });

/* Safe accessor — tolerates new ({kesPerUnit}) and legacy (number) shapes */
const kesPerUnitOf = (code) => {
  const r = _rates[code];
  if (r == null) return 1;
  if (typeof r === 'number') return r || 1;
  return Number(r.kesPerUnit) || 1;
};

export const formatCurrency = (amountInKes) => {
  const kes = Number(amountInKes) || 0;
  const value = kes / kesPerUnitOf(_currency);
  const meta = metaFor(_currency);

  const num = value.toLocaleString(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${meta.symbol} ${num}`;
};

export const formatInCurrency = (amountInKes, code) => {
  const kes = Number(amountInKes) || 0;
  const value = kes / kesPerUnitOf(code);
  const meta = metaFor(code);

  const num = value.toLocaleString(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${meta.symbol} ${num}`;
};

export const calcDiscounted = (price, original) =>
  original ? Math.round(((original - price) / original) * 100) : 0;