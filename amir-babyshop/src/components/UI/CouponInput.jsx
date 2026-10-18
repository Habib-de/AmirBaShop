import { useState } from 'react';
import { Ticket, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useExtras } from '../../context/ExtrasContext';
import { formatCurrency } from '../../utils/format';

/**
 * Reusable coupon input.
 * @param {number} subtotal — needed for validation (min order, percent calc)
 */
export default function CouponInput({ subtotal }) {
  const { appliedCoupon, applyCoupon, removeCoupon, couponDiscount } = useExtras();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  const handleApply = async (e) => {
    e.preventDefault();
    if (applying) return;

    setError('');
    setApplying(true);

    try {
      const res = await applyCoupon(code, subtotal);

      if (!res.ok) {
        setError(res.error);
        return;
      }

      if (res.coupon.type === 'freeship') {
        toast.success('Free shipping applied!', { icon: '🚚' });
      } else {
        toast.success(`${res.coupon.code} applied`, { icon: '🎟️' });
      }
      setCode('');
    } catch (err) {
      setError(err?.message || 'Could not apply coupon');
    } finally {
      setApplying(false);
    }
  };

  const handleRemove = () => {
    removeCoupon();
    setError('');
    toast.success('Coupon removed', { icon: '❌' });
  };

  /* ─── Applied state ─── */
  if (appliedCoupon) {
    /* `appliedCoupon` after backend validation is { code, type, discount }.
       No `value` field — we show the discount amount instead. */
    const summary =
      appliedCoupon.type === 'freeship'
        ? 'Free shipping'
        : couponDiscount > 0
        ? `You save ${formatCurrency(couponDiscount)}`
        : 'Applied';

    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black font-mono text-emerald-800 truncate">
              {appliedCoupon.code}
            </p>
            <p className="text-[10px] text-emerald-700 font-semibold">
              {summary}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="w-8 h-8 rounded-full bg-white hover:bg-rose-50 text-rose-500 flex items-center justify-center transition-colors shrink-0"
            aria-label="Remove coupon"
            title="Remove coupon"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  /* ─── Input state ─── */
  return (
    <div>
      <form onSubmit={handleApply} className="flex gap-2">
        <div className="relative flex-1">
          <Ticket size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amir-dark/40" />
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="Promo code"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink focus:outline-none text-sm font-mono uppercase tracking-wider bg-white"
            maxLength={20}
            disabled={applying}
          />
        </div>
        <button
          type="submit"
          disabled={!code.trim() || applying}
          className="px-4 py-2.5 rounded-xl bg-amir-dark hover:bg-amir-dark/90 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 inline-flex items-center justify-center gap-1.5 min-w-[72px]"
        >
          {applying ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span className="hidden xs:inline">…</span>
            </>
          ) : (
            'Apply'
          )}
        </button>
      </form>

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-500 font-semibold">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}