import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { currencyService, CURRENCY_META } from '../services/api';
import { setCurrencyRuntime } from '../utils/format';

const CurrencyContext = createContext();
export const useCurrency = () => useContext(CurrencyContext);

/* ═══════════════════════════════════════════════════════════
   PROVIDER
   ─────────────────────────────────────────────────────────
   - Loads rates + saved preference on mount
   - Keeps utils/format.js module runtime in sync
   - Exposes: currency, rates, convert(), toggle(), setCurrency()
   ═══════════════════════════════════════════════════════════ */
export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState('KES');
  const [rates, setRates] = useState({ KES: 1, USD: 130 });
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
        setRates(r);
        setCurrencyState(c);
        // Sync the format.js runtime IMMEDIATELY so first render is correct
        setCurrencyRuntime(c, r);
      } catch (err) {
        console.warn('[Currency] init failed, using defaults:', err.message);
        setCurrencyRuntime('KES', { KES: 1, USD: 130 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ─── Keep format.js in sync whenever state changes ─── */
  useEffect(() => {
    setCurrencyRuntime(currency, rates);
  }, [currency, rates]);

  /* ─── Switch currency ─── */
  const setCurrency = useCallback(async (code) => {
    if (!CURRENCY_META[code]) return;
    setCurrencyState(code);        // optimistic
    try {
      await currencyService.setPreferred(code);
    } catch (err) {
      console.warn('[Currency] save failed:', err.message);
    }
  }, []);

  /* ─── Cycle KES → USD → KES ─── */
  const toggle = useCallback(() => {
    const order = ['KES', 'USD'];
    const idx = order.indexOf(currency);
    const next = order[(idx + 1) % order.length];
    setCurrency(next);
  }, [currency, setCurrency]);

  /* ─── Convert an amount from base (KES) to display currency ─── */
  const convert = useCallback((amountKes, toCode) => {
    const num = Number(amountKes) || 0;
    const to = toCode || currency;
    const kesPerUnit = rates[to] || 1;
    return num / kesPerUnit;
  }, [rates, currency]);

  const value = useMemo(() => ({
    currency,
    meta: CURRENCY_META[currency],
    rates,
    loading,
    setCurrency,
    toggle,
    convert,
    supported: Object.keys(CURRENCY_META),
  }), [currency, rates, loading, setCurrency, toggle, convert]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}