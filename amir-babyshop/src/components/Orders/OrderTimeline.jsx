import { CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';

const STEPS = [
  { key: 'placed',    label: 'Order placed', icon: Clock,        desc: 'We received your order' },
  { key: 'confirmed', label: 'Confirmed',    icon: CheckCircle2, desc: 'Your order is being prepared' },
  { key: 'fulfilled', label: 'Fulfilled',    icon: Truck,        desc: 'Out for delivery / delivered' },
];

/**
 * OrderTimeline
 * @param {string} status - 'pending' | 'confirmed' | 'fulfilled' | 'cancelled'
 * @param {boolean} compact - true = horizontal stepper (for card headers)
 *                            false = vertical timeline (for expanded views)
 */
export default function OrderTimeline({ status, compact = false }) {
  const isCancelled = status === 'cancelled';

  // Which step is currently active (0, 1, 2)
  const stepIndex = {
    pending:   0,
    confirmed: 1,
    fulfilled: 2,
    cancelled: -1,
  }[status] ?? 0;

  /* ─── CANCELLED STATE ─── */
  if (isCancelled) {
    return (
      <div
        className={`flex items-start gap-2.5 ${
          compact ? 'p-2' : 'p-3'
        } bg-rose-50 border-l-4 border-rose-400 rounded-lg`}
      >
        <XCircle size={compact ? 14 : 18} className="text-rose-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className={`font-bold text-rose-700 ${compact ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
            Order cancelled
          </p>
          <p className={`text-rose-600/80 ${compact ? 'text-[10px]' : 'text-[10px] sm:text-xs'} mt-0.5`}>
            This order was cancelled. Contact support if this was a mistake.
          </p>
        </div>
      </div>
    );
  }

  /* ─── COMPACT — horizontal stepper (for card headers) ─── */
  if (compact) {
    return (
      <div className="flex items-center gap-1 py-1">
        {STEPS.map((step, i) => {
          const done = i <= stepIndex;
          const isCurrent = i === stepIndex;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-2 ring-emerald-300 ring-offset-1' : ''}`}
              >
                <Icon size={12} strokeWidth={3} />
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors ${
                    i < stepIndex ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ─── FULL — vertical timeline (for detail views) ─── */
  return (
    <div className="space-y-3">
      {STEPS.map((step, i) => {
        const done = i <= stepIndex;
        const isCurrent = i === stepIndex;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-start gap-3 relative">
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`absolute left-[15px] top-8 bottom-[-12px] w-0.5 ${
                  i < stepIndex ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}

            {/* Icon bubble */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                done
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
              } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
            >
              <Icon size={14} strokeWidth={2.5} />
            </div>

            {/* Text */}
            <div className="min-w-0 pt-0.5">
              <p
                className={`text-sm font-bold leading-tight ${
                  done ? 'text-amir-dark' : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>
              <p
                className={`text-[11px] mt-0.5 ${
                  done ? 'text-amir-dark/60' : 'text-gray-400'
                }`}
              >
                {step.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}