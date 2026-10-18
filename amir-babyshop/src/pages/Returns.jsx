import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, RotateCcw, Search, X, ChevronDown,
  CheckCircle2, XCircle, Clock, Truck, AlertCircle,
  Mail, MessageSquare, Box, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useExtras } from '../context/ExtrasContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';

const STATUS_META = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700',   icon: Clock },
  approved:  { label: 'Approved',  cls: 'bg-blue-100 text-blue-700',     icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  cls: 'bg-rose-100 text-rose-700',     icon: XCircle },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

export default function Returns() {
  const { user, isStaff } = useAuth();

  /* ─── Not logged in AND guest user (no email) ─── */
  if (!user && !isStaff) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-xl font-black mb-3">Sign in to view your returns</h1>
        <p className="text-xs text-amir-dark/60 font-semibold mb-5">
          You can track returns from your orders once signed in.
        </p>
        <Link to="/login" className="btn-primary inline-flex">Sign in</Link>
      </div>
    );
  }

  return isStaff ? <StaffReturnsView /> : <CustomerReturnsView />;
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMER / GUEST VIEW
   ═══════════════════════════════════════════════════════════ */
function CustomerReturnsView() {
  const { user } = useAuth();
  const { getMyReturns } = useExtras();
  const [expanded, setExpanded] = useState(null);

  const myReturns = useMemo(
    () => getMyReturns(user?.email),
    [getMyReturns, user]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <RotateCcw size={24} className="text-amir-pink" />
          My Returns
        </h1>
        <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
          Track your return requests
        </p>
      </div>

      {myReturns.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📦</div>
          <p className="font-bold">No return requests</p>
          <p className="text-xs text-amir-dark/60 mt-1 mb-5">
            Start a return from any delivered order
          </p>
          <Link to="/my-orders" className="btn-primary inline-flex text-sm">
            Go to My Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myReturns.map(r => (
            <CustomerReturnCard
              key={r.id}
              returnReq={r}
              expanded={expanded === r.id}
              onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Customer card ─── */
function CustomerReturnCard({ returnReq, expanded, onToggle }) {
  const meta = STATUS_META[returnReq.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const totalRefund = returnReq.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-3 sm:p-4 active:bg-amir-cream/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-black text-sm font-mono truncate">{returnReq.id}</p>
            <p className="text-[10px] text-amir-dark/50 font-semibold">
              for order <span className="font-mono">{returnReq.orderId}</span> ·{' '}
              {new Date(returnReq.createdAt).toLocaleDateString([], {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`badge text-[10px] px-2 py-0.5 inline-flex items-center gap-1 ${meta.cls}`}>
              <Icon size={10} /> {meta.label}
            </span>
            <ChevronDown
              size={16}
              className={`text-amir-dark/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amir-dark/5">
          <div className="flex gap-1">
            {returnReq.items.slice(0, 4).map((it, i) => (
              <img
                key={i}
                src={it.image}
                alt=""
                className="w-9 h-9 rounded-lg object-cover border border-gray-100"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ))}
            {returnReq.items.length > 4 && (
              <div className="w-9 h-9 rounded-lg bg-amir-cream flex items-center justify-center text-[10px] font-bold text-amir-dark/60">
                +{returnReq.items.length - 4}
              </div>
            )}
          </div>
          <div className="text-right ml-auto shrink-0">
            <p className="text-xs font-black">{formatCurrency(totalRefund)}</p>
            <p className="text-[9px] text-amir-dark/50 font-semibold">
              {returnReq.items.length} item{returnReq.items.length !== 1 && 's'}
            </p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amir-dark/5 p-3 sm:p-4 bg-amir-cream/30 animate-fade-in space-y-3">

          {/* Reason */}
          <div className="bg-white rounded-xl p-3 border border-amir-dark/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-1">
              Reason
            </p>
            <p className="text-xs font-bold text-amir-dark">{returnReq.reason}</p>
            {returnReq.note && (
              <p className="text-[11px] text-amir-dark/70 mt-1 leading-relaxed">
                {returnReq.note}
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
              Items ({returnReq.items.length})
            </p>
            <div className="space-y-2">
              {returnReq.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl p-2 border border-amir-dark/5">
                  <img
                    src={it.image}
                    alt={it.name}
                    className="w-11 h-11 rounded-lg object-cover shrink-0"
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

          {/* Status timeline */}
          <div className="bg-white rounded-xl p-3 border border-amir-dark/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
              Progress
            </p>
            <div className="flex items-center gap-1.5">
              {['pending', 'approved', 'completed'].map((step, idx) => {
                const stepIdx = ['pending', 'approved', 'completed'].indexOf(returnReq.status);
                const rejected = returnReq.status === 'rejected';
                const done = !rejected && idx <= stepIdx;
                return (
                  <div key={step} className="flex-1">
                    <div className={`h-1.5 rounded-full ${
                      rejected ? 'bg-rose-200' : done ? 'bg-emerald-400' : 'bg-amir-cream'
                    }`} />
                    <p className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 ${
                      rejected ? 'text-rose-400' : done ? 'text-emerald-600' : 'text-amir-dark/40'
                    }`}>
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
            {returnReq.status === 'rejected' && (
  <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
    <p className="text-[11px] font-black text-rose-700 uppercase tracking-wider">
      ❌ Return rejected
    </p>
    <p className="text-[11px] text-rose-700 leading-relaxed">
      <strong>Reason:</strong>{' '}
      {returnReq.rejectionReason || 'Not specified'}
    </p>
    <Link
      to="/contact"
      className="text-[10px] font-bold text-rose-700 underline inline-block"
    >
      Contact support if you have questions →
    </Link>
  </div>
)}
            {returnReq.status === 'completed' && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-3">
                ✅ Refund processed. It may take 3-5 business days.
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAFF VIEW
   ═══════════════════════════════════════════════════════════ */
function StaffReturnsView() {
  const {
    returns, returnCounts,
    approveReturn, rejectReturn, completeReturn,
  } = useExtras();

  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    let list = [...returns];
    if (filter !== 'all') list = list.filter(r => r.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.customerEmail?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [returns, filter, query]);

  const tabs = [
    { id: 'pending',   label: 'Pending',   count: returnCounts.pending },
    { id: 'approved',  label: 'Approved',  count: returnCounts.approved },
    { id: 'completed', label: 'Completed', count: returnCounts.completed },
    { id: 'rejected',  label: 'Rejected',  count: returnCounts.rejected },
    { id: 'all',       label: 'All',       count: returnCounts.total },
  ];

  const handleApprove = (r) => {
    approveReturn(r.id);
    toast.success(`${r.id} approved`, { icon: '✅' });
    setExpanded(null);
  };

  const handleReject = (r) => {
    if (confirm(`Reject return ${r.id}?`)) {
      rejectReturn(r.id);
      toast.error('Return rejected', { icon: '❌' });
      setExpanded(null);
    }
  };

  const handleComplete = (r) => {
    completeReturn(r.id);
    toast.success(`${r.id} marked complete`, { icon: '🎉' });
    setExpanded(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <RotateCcw size={24} className="text-amir-pink" />
          Returns
        </h1>
        <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
          Review and manage return requests
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`shrink-0 px-3.5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
              filter === t.id
                ? 'bg-amir-pink text-amir-dark shadow-sm'
                : 'bg-transparent text-gray-500 hover:text-amir-dark hover:bg-amir-pink/10'
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 rounded-full ${
              filter === t.id ? 'bg-amir-dark/10' : 'bg-gray-100'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amir-dark/40" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by return ID, order ID, name, or email..."
          className="input pl-11 pr-11"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-amir-dark/40 hover:text-amir-dark hover:bg-amir-pink/20"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">
            {filter === 'pending' ? '🎉' : '📭'}
          </div>
          <p className="font-bold">
            {filter === 'pending' && returnCounts.pending === 0
              ? 'No pending returns'
              : 'No returns found'}
          </p>
          <p className="text-xs text-amir-dark/60 mt-1">
            {filter === 'pending'
              ? 'New return requests will appear here'
              : 'Try a different filter or search'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <StaffReturnCard
              key={r.id}
              returnReq={r}
              expanded={expanded === r.id}
              onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
              onApprove={() => handleApprove(r)}
              onReject={() => handleReject(r)}
              onComplete={() => handleComplete(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Staff card ─── */
function StaffReturnCard({ returnReq, expanded, onToggle, onApprove, onReject, onComplete }) {
  const meta = STATUS_META[returnReq.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const totalRefund = returnReq.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-3 sm:p-4 active:bg-amir-cream/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-black text-xs sm:text-sm font-mono truncate">
              {returnReq.id}
            </p>
            <p className="text-[10px] text-amir-dark/50 font-semibold truncate">
              <span className="font-mono">{returnReq.orderId}</span> · {returnReq.customerName || 'Guest'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`badge text-[9px] px-1.5 py-0.5 inline-flex items-center gap-1 ${meta.cls}`}>
              <Icon size={9} /> {meta.label}
            </span>
            <ChevronDown
              size={14}
              className={`text-amir-dark/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amir-dark/5">
          <div className="flex gap-1">
            {returnReq.items.slice(0, 3).map((it, i) => (
              <img
                key={i}
                src={it.image}
                alt=""
                className="w-8 h-8 rounded-lg object-cover border border-gray-100"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ))}
            {returnReq.items.length > 3 && (
              <div className="w-8 h-8 rounded-lg bg-amir-cream flex items-center justify-center text-[9px] font-bold text-amir-dark/60">
                +{returnReq.items.length - 3}
              </div>
            )}
          </div>
          <div className="text-right ml-auto shrink-0">
            <p className="text-xs font-black">{formatCurrency(totalRefund)}</p>
            <p className="text-[9px] text-amir-dark/50 font-semibold">
              {new Date(returnReq.createdAt).toLocaleDateString([], {
                month: 'short', day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amir-dark/5 p-3 sm:p-4 bg-amir-cream/30 animate-fade-in space-y-3">

          {/* Customer info */}
          <div className="bg-white rounded-xl p-3 border border-amir-dark/5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-1">
              Customer
            </p>
            <p className="text-xs font-bold">{returnReq.customerName || 'Guest'}</p>
            {returnReq.customerEmail && (
              <p className="text-[11px] text-amir-dark/70 flex items-center gap-1.5">
                <Mail size={11} className="shrink-0" /> {returnReq.customerEmail}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="bg-white rounded-xl p-3 border border-amir-dark/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-1">
              Reason
            </p>
            <p className="text-xs font-bold text-amir-dark">{returnReq.reason}</p>
            {returnReq.note && (
              <p className="text-[11px] text-amir-dark/70 mt-1 leading-relaxed">
                {returnReq.note}
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
              Items ({returnReq.items.length})
            </p>
            <div className="space-y-2">
              {returnReq.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl p-2 border border-amir-dark/5">
                  <img src={it.image} alt={it.name} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight line-clamp-2">{it.name}</p>
                    <p className="text-[10px] text-amir-dark/50 font-semibold mt-0.5">
                      {[it.size, it.color].filter(Boolean).join(' • ') || 'Standard'} · Qty {it.qty}
                    </p>
                  </div>
                  <p className="text-xs font-black shrink-0">
                    {formatCurrency(it.price * it.qty)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-amir-dark/5">
            {returnReq.status === 'pending' && (
              <>
                <button
                  onClick={onApprove}
                  className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95"
                >
                  <CheckCircle2 size={13} /> Approve
                </button>
                <button
                  onClick={onReject}
                  className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all active:scale-95"
                >
                  <XCircle size={13} /> Reject
                </button>
              </>
            )}

            {returnReq.status === 'approved' && (
              <button
                onClick={onComplete}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs transition-all active:scale-95"
              >
                <Truck size={13} /> Mark as completed
              </button>
            )}

            {returnReq.status === 'completed' && (
              <div className="flex-1 text-center py-2 text-xs font-bold text-emerald-600">
                ✅ This return is complete
              </div>
            )}

            {returnReq.status === 'rejected' && (
              <div className="flex-1 text-center py-2 text-xs font-bold text-rose-600">
                ❌ This return was rejected
              </div>
            )}
          </div>

          {/* Status timestamp */}
          <p className="text-[10px] text-amir-dark/40 text-center pt-1">
            Last updated {new Date(returnReq.updatedAt).toLocaleString([], {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
}