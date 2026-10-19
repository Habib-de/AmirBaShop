import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, RefreshCw, ChevronDown, MapPin, RotateCcw, CheckCircle2, Printer, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { useExtras } from '../context/ExtrasContext';
import { formatCurrency } from '../utils/format';
import OrderTimeline from '../components/Orders/OrderTimeline';
import TrackingTimeline from '../components/Orders/TrackingTimeline';
import ReturnModal from '../components/Orders/ReturnModal';
import InvoiceModal from '../components/Orders/InvoiceModal';
import { formatETA, daysUntilETA } from '../utils/carrierHelpers';

const STATUS_META = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-800' },
  fulfilled: { label: 'Fulfilled', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-800' },
};

export default function MyOrders() {
  const { user } = useAuth();
  const { findByCustomer, markOrdersSeen, getUnseenCount, orders } = useOrders();
  const { getMyReturns } = useExtras();

  const [expanded, setExpanded] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(null);
  const [invoicing, setInvoicing] = useState(null);

  const myOrders = useMemo(() => {
    if (!user) return [];
    return findByCustomer(user.email);
  }, [user, findByCustomer, orders]);

  const myReturns = useMemo(
    () => (user ? getMyReturns(user.email) : []),
    [user, getMyReturns]
  );

  const hasReturned = (orderId) =>
    myReturns.some(r => r.orderId === orderId && r.status !== 'rejected');

  const unseenCount = user ? getUnseenCount(user.email) : 0;

  useEffect(() => {
    if (user?.email) {
      const t = setTimeout(() => markOrdersSeen(user.email), 1500);
      return () => clearTimeout(t);
    }
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-xl font-black mb-3">Sign in to see your orders</h1>
        <Link to="/login" className="btn-primary inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">

      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black">My orders</h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
            Track your order history
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="shrink-0 w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={`transition-transform duration-500 ${refreshing ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {unseenCount > 0 && (
        <div className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md animate-fade-in">
          <span className="relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
            <span className="relative w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Package size={16} />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm">
              {unseenCount} update{unseenCount !== 1 ? 's' : ''} on your order{unseenCount !== 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-white/85">
              Check the latest status below
            </p>
          </div>
        </div>
      )}

      {myOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📦</div>
          <p className="font-bold">No orders yet</p>
          <p className="text-xs text-amir-dark/60 mt-1 mb-5">
            When you place your first order, it'll show up here
          </p>
          <Link to="/shop" className="btn-primary inline-flex">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
                    {myOrders.map(o => {
            // 🔥 READ CHECKPOINTS
            const checkpoints = o.checkpoints || [];
            const lastCheckpoint = checkpoints[checkpoints.length - 1];
            
            let displayLabel = STATUS_META[o.status]?.label || 'Pending';
            let displayClass = STATUS_META[o.status]?.cls || STATUS_META.pending.cls;

            if (lastCheckpoint) {
              displayLabel = lastCheckpoint.label;
              if (lastCheckpoint.type === 'delivered' || lastCheckpoint.type === 'collected') {
                displayClass = STATUS_META.fulfilled.cls;
              } else {
                displayClass = 'bg-blue-100 text-blue-800';
              }
            }

            const isOpen = expanded === o.id;
            const canReturn = o.status === 'fulfilled';
            const alreadyReturned = hasReturned(o.id);

            const etaDays = o.eta ? daysUntilETA(o.eta) : null;
const isDone = o.status === 'fulfilled';
const isPickup = o.carrier === 'pickup-store';

const etaHint =
  isDone
    ? (isPickup ? 'Collected' : 'Delivered')
    : etaDays === null ? ''
    : etaDays < 0     ? (isPickup ? 'Collected' : 'Delivered')
    : etaDays === 0   ? 'Arriving today'
    : etaDays === 1   ? 'Arriving tomorrow'
    :                   `Arriving in ${etaDays} days`;

            return (
              <div key={o.id} className="card overflow-hidden">

                <button
                  onClick={() => setExpanded(isOpen ? null : o.id)}
                  className="w-full text-left p-3 sm:p-4 active:bg-amir-cream/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-black text-xs sm:text-sm font-mono truncate">{o.id}</p>
                      <p className="text-[10px] text-amir-dark/50 font-semibold">
                        {new Date(o.createdAt).toLocaleString([], {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`badge text-[10px] px-2 py-0.5 ${displayClass}`}>
  {displayLabel}
</span>
                      <ChevronDown
                        size={16}
                        className={`text-amir-dark/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                                    {/* {o.checkpoints && o.checkpoints.length > 0 ? (
                    <div className="mt-2">
                      <TrackingTimeline checkpoints={o.checkpoints} carrierId={o.carrier} compact />
                    </div>
                  ) : (
                    <OrderTimeline status={o.status} compact />
                  )} */}

                  {o.trackingNumber && (
                    <div className="mt-3 pt-3 border-t border-amir-dark/5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Truck size={13} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-amir-dark truncate">
                            {o.carrierName}
                          </p>
                          <p className="text-[10px] text-amir-dark/60 font-mono font-semibold truncate">
                            {o.trackingNumber}
                          </p>
                        </div>
                        {o.eta && (
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-blue-700">
                              {formatETA(o.eta)}
                            </p>
                            {etaHint && (
                              <p className="text-[9px] text-amir-dark/50 font-semibold">
                                {etaHint}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-amir-dark/5">
                    <div className="flex gap-1">
                      {o.items.slice(0, 4).map((it, i) => (
                        <img
                          key={i}
                          src={it.image}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover border border-gray-100"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ))}
                      {o.items.length > 4 && (
                        <div className="w-8 h-8 rounded-lg bg-amir-cream flex items-center justify-center text-[10px] font-bold text-amir-dark/60">
                          +{o.items.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-sm leading-none">{formatCurrency(o.total)}</p>
                      <p className="text-[10px] text-amir-dark/50 font-semibold mt-0.5">
                        {o.items.length} item{o.items.length !== 1 && 's'}
                      </p>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-amir-dark/5 p-3 sm:p-4 bg-amir-cream/30 animate-fade-in space-y-4">

                                                            {o.trackingNumber && o.checkpoints?.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 flex items-center gap-1.5">
                            <Truck size={11} /> Tracking · {o.carrierName}
                          </p>
                          {o.eta && (
                            <p className="text-[10px] font-bold text-blue-700">
                              ETA {formatETA(o.eta)}
                            </p>
                          )}
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-amir-dark/5">
                          <p className="text-[10px] font-mono font-bold text-amir-dark/60 mb-3">
                            {o.trackingNumber}
                          </p>
                          <TrackingTimeline checkpoints={o.checkpoints} carrierId={o.carrier} compact={true} />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
                          Order progress
                        </p>
                        <OrderTimeline status={o.status} />
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
                        Items ({o.items.length})
                      </p>
                      <div className="space-y-2">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl p-2 border border-amir-dark/5">
                            <img
                              src={it.image}
                              alt={it.name}
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold leading-tight line-clamp-2">{it.name}</p>
                              <p className="text-[10px] text-amir-dark/50 font-semibold mt-0.5">
                                {[it.size, it.color].filter(Boolean).join(' • ') || 'Standard'}
                                {' · '}Qty {it.qty}
                              </p>
                            </div>
                            <p className="text-xs font-black shrink-0">
                              {formatCurrency(it.price * it.qty)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {o.customer?.address && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
                          Delivery address
                        </p>
                        <div className="bg-white rounded-xl p-3 border border-amir-dark/5 flex items-start gap-2">
                          <MapPin size={14} className="text-amir-dark/50 shrink-0 mt-0.5" />
                          <div className="text-xs text-amir-dark/70 leading-relaxed">
                            <p className="font-semibold">{o.customer.name}</p>
                            <p>{o.customer.address}</p>
                            {(o.customer.city || o.customer.zip) && (
                              <p>{[o.customer.city, o.customer.zip].filter(Boolean).join(', ')}</p>
                            )}
                            {o.customer.phone && (
                              <p className="mt-0.5 text-amir-dark/50">{o.customer.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-xl p-3 border border-amir-dark/5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-amir-dark/60">Order total</span>
                      <span className="font-black text-base">{formatCurrency(o.total)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInvoicing(o)}
                      className="w-full py-3 rounded-full bg-white border-2 border-gray-200 text-amir-dark hover:bg-gray-50 font-bold text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                    >
                      <Printer size={16} /> Print receipt
                    </button>

                    {canReturn && (
                      <div className="pt-2 border-t border-amir-dark/10">
                        {alreadyReturned ? (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-emerald-800">
                                Return requested
                              </p>
                              <p className="text-[10px] text-emerald-700">
                                Check status on{' '}
                                <Link to="/returns" className="underline font-bold">
                                  My Returns
                                </Link>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRequesting(o)}
                            className="w-full py-3 rounded-full bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                          >
                            <RotateCcw size={16} /> Request return
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {requesting && (
        <ReturnModal
          order={requesting}
          onClose={() => setRequesting(null)}
          onSuccess={() => {
            setRequesting(null);
            toast.success('Return request submitted', { icon: '📦' });
          }}
        />
      )}

      {invoicing && (
        <InvoiceModal
          order={invoicing}
          title="Receipt"
          onClose={() => setInvoicing(null)}
        />
      )}
    </div>
  );
}