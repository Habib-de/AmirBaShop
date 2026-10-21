import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_META } from '../../services/api';

export default function CurrencyToggle({ variant = 'pill' }) {
  const { currency, setCurrency, rates, loading } = useCurrency();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  if (loading) {
    return variant === 'pill' ? (
      <div className="w-14 h-10 rounded-full bg-gray-100 animate-pulse" />
    ) : (
      <div className="h-12 rounded-2xl bg-gray-100 animate-pulse" />
    );
  }

  const metaFor = (code) => {
    const r = rates?.[code];
    const hard = CURRENCY_META[code];
    return {
      code,
      symbol: r?.symbol || hard?.symbol || code,
      label: r?.label || hard?.label || code,
      flag: hard?.flag || '💱',
    };
  };

  const codes = Object.keys(rates || {});
  const orderedCodes = [
    ...(codes.includes('KES') ? ['KES'] : []),
    ...codes.filter(c => c !== 'KES').sort(),
  ];

  const current = metaFor(currency);

  const handlePick = (code) => {
    if (code !== currency) setCurrency(code);
    setOpen(false);
  };

  const trigger = variant === 'pill' ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="btn-icon h-10 sm:h-11 px-2.5 hover:bg-amir-pink/20 flex items-center gap-1"
      aria-label={`Currency: ${current.label}. Click to change.`}
      title={`${current.label} · click to change`}
    >
      <span className="text-sm leading-none">{current.flag}</span>
      <span className="font-black text-[11px] sm:text-xs text-amir-dark leading-none">
        {current.code}
      </span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-amir-pink/20 font-bold text-left"
      aria-label={`Currency: ${current.label}. Click to change.`}
    >
      <span className="text-base leading-none">{current.flag}</span>
      <span className="flex-1">
        <span className="block text-sm leading-tight">{current.label}</span>
        <span className="block text-[11px] text-amir-dark/50 font-semibold leading-tight">
          {current.symbol} · tap to change
        </span>
      </span>
      <span className="text-[10px] font-black text-amir-dark/60 uppercase tracking-wider">
        {current.code}
      </span>
    </button>
  );

  /* ─── Modal — rendered via portal so it escapes the header's stacking context ─── */
  const modal = open && createPortal(
  <div
    data-currency-portal
    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
    onClick={() => setOpen(false)}
  >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-amir-dark/5">
          <div>
            <p className="font-black text-base">Choose currency</p>
            <p className="text-[11px] text-amir-dark/60 font-semibold">
              Prices will convert automatically
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="btn-icon w-9 h-9 hover:bg-amir-pink/20"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {orderedCodes.length === 0 ? (
            <div className="p-6 text-center text-amir-dark/50 text-xs font-semibold">
              No currencies configured yet.
            </div>
          ) : (
            orderedCodes.map((code) => {
              const m = metaFor(code);
              const active = code === currency;
              const isBase = code === 'KES';
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handlePick(code)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                    active ? 'bg-amir-pink/30 font-black' : 'hover:bg-amir-pink/15 font-bold'
                  }`}
                >
                  <span className="text-xl leading-none">{m.flag}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm leading-tight truncate">
                      {m.code} · {m.symbol}
                      {isBase && (
                        <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider text-amir-dark/40">
                          base
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-amir-dark/50 font-semibold leading-tight truncate">
                      {m.label}
                    </span>
                  </span>
                  {active && <Check size={16} className="text-amir-dark shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-amir-dark/5 text-[10px] text-amir-dark/50 font-semibold text-center">
          Your choice is saved to your account
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {trigger}
      {modal}
    </>
  );
}