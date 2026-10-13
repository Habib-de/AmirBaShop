import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle2, Truck, XCircle, MapPin } from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import { formatCurrency } from '../utils/format';
import TrackingTimeline from '../components/Orders/TrackingTimeline';
import { formatETA, daysUntilETA } from '../utils/carrierHelpers';

const STATUS_META = {
  pending:   { label: 'Pending',   icon: <Clock size={14} />,        cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmed', icon: <CheckCircle2 size={14} />, cls: 'bg-blue-100 text-blue-800' },
  fulfilled: { label: 'Fulfilled', icon: <Truck size={14} />,        cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', icon: <XCircle size={14} />,      cls: 'bg-rose-100 text-rose-800' },
};

export default function TrackOrder() {
  const { orders } = useOrders();
  const location = useLocation();
  const prefill = location.state?.orderId || '';

  const [query, setQuery] = useState(prefill);
  const [searched, setSearched] = useState(!!prefill);

  useEffect(() => {
    if (prefill) {
      setQuery(prefill);
      setSearched(true);
    }
  }, [prefill]);

  const trimmed = query.trim().toLowerCase();
  const cleanDigits = trimmed.replace(/\D/g, '');

  const results = trimmed
    ? orders.filter(o => {
        const idMatch = o.id.toLowerCase().includes(trimmed);
        const trackingMatch = o.trackingNumber?.toLowerCase().includes(trimmed);
        const emailMatch = o.customer?.email?.toLowerCase() === trimmed;

        const phoneMatch =
          o.customer?.phone &&
          cleanDigits.length >= 6 &&
          o.customer.phone.replace(/\D/g, '').includes(cleanDigits);

        return idMatch || trackingMatch || emailMatch || phoneMatch;
      })
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearched(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">📦</div>
        <h1 className="text-2xl sm:text-3xl font-black">Track your order</h1>
        <p className="text-sm text-amir-dark/60 font-semibold mt-1">
          Enter your Order ID, tracking number, email, or phone
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 sm:p-5 mb-5">
        <div className="relative mb-3">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amir-dark/40" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSearched(false); }}
            placeholder="e.g. ORD-123456 or G4S-2026-12345678"
            className="input pl-11"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary w-full py-3">
          Track order
        </button>
        <p className="text-[11px] text-amir-dark/50 font-semibold text-center mt-3">
          💡 Try your Order ID, tracking number, email, or phone
        </p>
      </form>

      {searched && (
        <>
          {results.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <p className="font-bold">No orders found</p>
              <p className="text-xs text-amir-dark/60 mt-1">
                Double-check your Order ID or tracking number, or{' '}
                <Link to="/contact" className="text-amir-dark underline font-bold">
                  contact support
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-amir-dark/60 px-1">
                {results.length} order{results.length !== 1 && 's'} found
              </p>

              {results.map(o => {
                const meta = STATUS_META[o.status] || STATUS_META.pending;
                const etaDays = o.eta ? daysUntilETA(o.eta) : null;
                const etaHint =
                  etaDays === null ? '' :
                  etaDays < 0     ? 'Delivered' :
                  etaDays === 0   ? 'Arriving today' :
                  etaDays === 1   ? 'Arriving tomorrow' :
                                    `Arriving in ${etaDays} days`;

                return (
                  <div key={o.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-black text-sm font-mono truncate">{o.id}</p>
                        <p className="text-[10px] text-amir-dark/50 font-semibold">
                          {new Date(o.createdAt).toLocaleString([], {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`badge ${meta.cls} inline-flex items-center gap-1 shrink-0`}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>

                    {o.trackingNumber && (
                      <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck size={14} className="text-blue-600 shrink-0" />
                          <p className="text-xs font-bold text-blue-900">
                            {o.carrierName}
                          </p>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-blue-800 mb-1">
                          {o.trackingNumber}
                        </p>
                        {o.eta && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-blue-700">
                              ETA: {formatETA(o.eta)}
                            </span>
                            {etaHint && (
                              <span className="text-[10px] text-blue-700/80 font-semibold">
                                · {etaHint}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {(!o.checkpoints || o.checkpoints.length === 0) && (
                      <div className="flex items-center gap-1 mb-3">
                        {['pending', 'confirmed', 'fulfilled'].map((step) => {
                          const isDone =
                            ['confirmed', 'fulfilled'].includes(o.status) && step === 'pending' ||
                            o.status === 'fulfilled' && ['pending', 'confirmed'].includes(step) ||
                            o.status === step;
                          const isCancelled = o.status === 'cancelled';
                          return (
                            <div key={step} className="flex-1">
                              <div className={`h-1.5 rounded-full ${
                                isCancelled ? 'bg-rose-200' :
                                isDone ? 'bg-emerald-400' : 'bg-amir-cream'
                              }`} />
                              <p className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 ${
                                isCancelled ? 'text-rose-400' :
                                isDone ? 'text-emerald-600' : 'text-amir-dark/40'
                              }`}>
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {o.checkpoints && o.checkpoints.length > 0 && (
                      <div className="mb-3 p-3 rounded-xl bg-white border border-amir-dark/5">
                        <TrackingTimeline checkpoints={o.checkpoints} carrierId={o.carrier} compact />
                      </div>
                    )}

                    <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-3">
                      {o.items.slice(0, 6).map((it, i) => (
                        <div key={i} className="relative shrink-0">
                          <img src={it.image} alt={it.name} className="w-12 h-12 rounded-lg object-cover" />
                          <span className="absolute -top-1 -right-1 bg-amir-dark text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                            {it.qty}
                          </span>
                        </div>
                      ))}
                      {o.items.length > 6 && (
                        <div className="shrink-0 w-12 h-12 rounded-lg bg-amir-cream flex items-center justify-center text-xs font-bold text-amir-dark/60">
                          +{o.items.length - 6}
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-xs text-amir-dark/60 font-semibold mb-3">
                      <MapPin size={12} className="shrink-0 mt-0.5" />
                      <span>
                        {o.customer?.address}, {o.customer?.city} {o.customer?.zip}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-amir-dark/5">
                      <span className="text-xs text-amir-dark/60 font-semibold">
                        {o.items.length} item{o.items.length !== 1 && 's'}
                      </span>
                      <span className="font-black text-base">{formatCurrency(o.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-amir-dark/50 font-semibold">
          Have an account?{' '}
          <Link to="/login" className="text-amir-dark underline font-bold">
            Sign in
          </Link>{' '}
          to see all your orders
        </p>
      </div>
    </div>
  );
}