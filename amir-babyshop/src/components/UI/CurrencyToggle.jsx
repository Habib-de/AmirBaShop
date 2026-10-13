import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_META } from '../../services/api';

/* ═══════════════════════════════════════════════════════════
   CURRENCY TOGGLE
   ─────────────────────────────────────────────────────────
   Two variants:
     variant="pill"  → compact pill for desktop header
     variant="row"   → full row for mobile drawer menu
   ═══════════════════════════════════════════════════════════ */
export default function CurrencyToggle({ variant = 'pill' }) {
  const { currency, toggle, loading, supported } = useCurrency();

  if (loading) {
    return variant === 'pill' ? (
      <div className="w-14 h-10 rounded-full bg-gray-100 animate-pulse" />
    ) : (
      <div className="h-12 rounded-2xl bg-gray-100 animate-pulse" />
    );
  }

  const meta = CURRENCY_META[currency];
  const nextCode = supported.find(c => c !== currency);
  const nextMeta = CURRENCY_META[nextCode];

  /* ─── Pill variant (desktop header) ─── */
  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggle}
        className="btn-icon w-10 h-10 sm:w-11 sm:h-11 hover:bg-amir-pink/20 flex items-center justify-center"
        aria-label={`Currency: ${meta.label}. Switch to ${nextMeta.label}`}
        title={`${meta.label} · Tap for ${nextMeta.label}`}
      >
        <span className="font-black text-[11px] sm:text-xs text-amir-dark leading-none">
          {meta.symbol}
        </span>
      </button>
    );
  }

  /* ─── Row variant (mobile drawer) ─── */
  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-amir-pink/20 font-bold text-left"
      aria-label={`Currency: ${meta.label}. Switch to ${nextMeta.label}`}
    >
      <span className="text-base leading-none">{meta.flag}</span>
      <span className="flex-1">
        <span className="block text-sm leading-tight">{meta.label}</span>
        <span className="block text-[11px] text-amir-dark/50 font-semibold leading-tight">
          {meta.symbol} · tap to switch
        </span>
      </span>
      <span className="text-[10px] font-black text-amir-dark/60 uppercase tracking-wider">
        {meta.code}
      </span>
    </button>
  );
}