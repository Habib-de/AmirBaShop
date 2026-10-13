/* ═══════════════════════════════════════════════════════════
   FORMAT UTILITIES
   ─────────────────────────────────────────────────────────
   ⚠️ formatCurrency() stays SYNCHRONOUS so the 22 pages using
   it don't need any refactor. It reads from module-level state
   kept in sync by CurrencyContext via setCurrencyRuntime().
   ═══════════════════════════════════════════════════════════ */

/* ─── Runtime state (updated by CurrencyContext) ─── */
let _currency = 'KES';
let _rates = { KES: 1, USD: 130 };   // 1 unit = X KES

const META = {
  KES: { symbol: 'KSh', locale: 'en-KE', decimals: 0 },
  USD: { symbol: '$',   locale: 'en-US', decimals: 2 },
};

/* ─── Called by CurrencyContext whenever currency/rates change ─── */
export const setCurrencyRuntime = (currency, rates) => {
  if (META[currency]) _currency = currency;
  if (rates && typeof rates === 'object') _rates = { ..._rates, ...rates };
};

/* ─── Read current runtime (useful for debugging / hints) ─── */
export const getCurrencyRuntime = () => ({ currency: _currency, rates: _rates });

/* ═══════════════════════════════════════════════════════════
   formatCurrency(amountInKes) → "KSh 1,500"  or  "$11.54"
   
   Always pass the RAW KES amount. Conversion happens here.
   ═══════════════════════════════════════════════════════════ */
export const formatCurrency = (amountInKes) => {
  const kes = Number(amountInKes) || 0;
  const kesPerUnit = _rates[_currency] || 1;
  const value = kes / kesPerUnit;
  const meta = META[_currency] || META.KES;

  const num = value.toLocaleString(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });

  return `${meta.symbol} ${num}`;
};

/* ═══════════════════════════════════════════════════════════
   formatInCurrency(amountInKes, 'USD') → force a specific currency
   Used for order-history hints ("≈ $11.54" under KSh 1,500)
   ═══════════════════════════════════════════════════════════ */
export const formatInCurrency = (amountInKes, code) => {
  const kes = Number(amountInKes) || 0;
  const kesPerUnit = _rates[code] || 1;
  const value = kes / kesPerUnit;
  const meta = META[code] || META.KES;

  const num = value.toLocaleString(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });

  return `${meta.symbol} ${num}`;
};

/* ─── Unchanged ─── */
export const calcDiscounted = (price, original) =>
  original ? Math.round(((original - price) / original) * 100) : 0;