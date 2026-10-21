import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { currencyService, CURRENCY_META } from '../services/api';
import { setCurrencyRuntime } from '../utils/format';

const CurrencyContext = createContext();
export const useCurrency = () => useContext(CurrencyContext);

/* Default rates — matches backend currency_rates shape */
const DEFAULT_RATES = {
  KES: { currencyCode: 'KES', kesPerUnit: 1,   symbol: 'KSh', label: 'Kenyan Shilling' },
  USD: { currencyCode: 'USD', kesPerUnit: 130, symbol: '$',   label: 'US Dollar' },
};

/* ═══════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════ */
export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState('KES');
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);

  /* ─── Initial load ─── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [r, c] = await Promise.all([
          currencyService.getRates(),
          currencyService.getPreferred(),
        ]);
        if (cancelled) return;
        const safeRates = r && Object.keys(r).length ? r : DEFAULT_RATES;
        setRates(safeRates);
        // If the saved preference no longer exists (currency was deleted), fall back to KES
        const safeCurrency = safeRates[c] ? c : 'KES';
        setCurrencyState(safeCurrency);
        setCurrencyRuntime(safeCurrency, safeRates);
      } catch (err) {
        console.warn('[Currency] init failed, using defaults:', err.message);
        setCurrencyRuntime('KES', DEFAULT_RATES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ─── Keep format.js in sync ─── */
  useEffect(() => {
    setCurrencyRuntime(currency, rates);
  }, [currency, rates]);

  /* ─── Switch currency (validated against real rates) ─── */
  const setCurrency = useCallback(async (code) => {
  console.log('[Currency] called:', code, '| rates keys:', Object.keys(rates), '| found:', !!rates[code]);
  if (!rates[code]) {
    console.error('[Currency] BLOCKED — code not in rates');
    return;
  }
  setCurrencyState(code);
  setCurrencyRuntime(code, rates);
  try {
    await currencyService.setPreferred(code);
    console.log('[Currency] backend saved:', code);
  } catch (err) {
    console.warn('[Currency] save failed:', err.message);
  }
}, [rates]);

  /* ─── Cycle through every currency in the DB ─── */
  const toggle = useCallback(() => {
    const order = Object.keys(rates);
    if (order.length < 2) return;
    const idx = order.indexOf(currency);
    const next = order[(idx + 1) % order.length];
    setCurrency(next);
  }, [rates, currency, setCurrency]);

  /* ─── Convert from base (KES) to display currency ─── */
  const convert = useCallback((amountKes, toCode) => {
    const num = Number(amountKes) || 0;
    const to = toCode || currency;
    const kesPerUnit = rates[to]?.kesPerUnit || 1;
    return num / kesPerUnit;
  }, [rates, currency]);

  /* ─── Reload rates from backend (called after staff edits) ─── */
  const refreshRates = useCallback(async () => {
    try {
      const r = await currencyService.getRates();
      if (r && Object.keys(r).length) {
        setRates(r);
        const safeCurrency = r[currency] ? currency : 'KES';
        if (safeCurrency !== currency) setCurrencyState(safeCurrency);
        setCurrencyRuntime(safeCurrency, r);
      }
      return r;
    } catch (err) {
      console.warn('[Currency] refresh failed:', err.message);
      throw err;
    }
  }, [currency]);

  const value = useMemo(() => {
    const hardcoded = CURRENCY_META[currency];
    const fromDb = rates[currency];
    const meta = fromDb
      ? {
          code: currency,
          symbol: fromDb.symbol,
          label: fromDb.label,
          decimals: currency === 'KES' ? 0 : 2,
          flag: hardcoded?.flag || '💱',
        }
      : hardcoded;

    return {
      currency,
      meta,
      rates,
      loading,
      setCurrency,
      toggle,
      convert,
      refreshRates,
      supported: Object.keys(rates),
    };
  }, [currency, rates, loading, setCurrency, toggle, convert, refreshRates]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}