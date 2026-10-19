import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw, Search, X, ChevronDown, CheckCircle2, XCircle,
  Clock, Truck, Mail, Phone, Package, Printer, Filter,
  AlertTriangle, TrendingUp, DollarSign, Download, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useExtras } from '../context/ExtrasContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';

const STATUS_META = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700',   icon: Clock,         color: 'amber' },
  approved:  { label: 'Approved',  cls: 'bg-blue-100 text-blue-700',     icon: CheckCircle2,  color: 'blue' },
  rejected:  { label: 'Rejected',  cls: 'bg-rose-100 text-rose-700',     icon: XCircle,       color: 'rose' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, color: 'emerald' },
};

const REASON_LABELS = {
  'Wrong size': 'Wrong size',
  'Defective item': 'Defective',
  'Not as described': 'Not as described',
  'Changed mind': 'Changed mind',
  'Wrong item sent': 'Wrong item',
  'Other': 'Other',
};

export default function StaffReturns() {
  const { user } = useAuth();
  const {
    returns, returnCounts,
    approveReturn, rejectReturn, completeReturn,
    notify,
  } = useExtras();

  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [rejecting, setRejecting] = useState(null);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalRefundValue = returns
      .filter(r => ['pending', 'approved', 'completed'].includes(r.status))
      .reduce((sum, r) =>
        sum + r.items.reduce((s, i) => s + i.price * i.qty, 0), 0);

    const pendingValue = returns
      .filter(r => r.status === 'pending')
      .reduce((sum, r) =>
        sum + r.items.reduce((s, i) => s + i.price * i.qty, 0), 0);

    // Average response time (pending → approved)
    const resolved = returns.filter(r => r.status !== 'pending');
    const avgHours = resolved.length > 0
      ? resolved.reduce((sum, r) => {
          const created = new Date(r.createdAt).getTime();
          const updated = new Date(r.updatedAt || r.createdAt).getTime();
          return sum + (updated - created) / (1000 * 60 * 60);
        }, 0) / resolved.length
      : 0;

    return { totalRefundValue, pendingValue, avgHours };
  }, [returns]);

  /* ─── Filtered + sorted ─── */
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

    switch (sortBy) {
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'highest':
        list.sort((a, b) => {
          const aVal = a.items.reduce((s, i) => s + i.price * i.qty, 0);
          const bVal = b.items.reduce((s, i) => s + i.price * i.qty, 0);
          return bVal - aVal;
        });
        break;
      default: // newest
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [returns, filter, query, sortBy]);

  /* ═══════════════ ACTIONS ═══════════════ */

  const handleApprove = (r) => {
    approveReturn(r.id);

    // 🔔 Notify the customer
    if (r.customerEmail) {
      notify(r.customerEmail, {
        type: 'order',
        title: `Return ${r.id} approved`,
        body: `Your return request has been approved. We'll arrange pickup/drop-off soon.`,
        link: '/returns',
      });
    }

    toast.success(`${r.id} approved — customer notified`, { icon: '✅' });
    setExpanded(null);
  };

    const handleReject = (r, reason) => {
    rejectReturn(r.id, reason); // 👈 PASS THE REASON HERE
    setRejecting(null);

    if (r.customerEmail) {
      notify(r.customerEmail, {
        type: 'order',
        title: `Return ${r.id} rejected`,
        body: reason
          ? `Your return was not approved. Reason: ${reason}`
          : 'Your return request was not approved. Contact us for details.',
        link: '/returns',
      });
    }

    toast.error(`${r.id} rejected — customer notified`, { icon: '❌' });
    setExpanded(null);
  };

  const handleComplete = (r) => {
    completeReturn(r.id);

    if (r.customerEmail) {
      notify(r.customerEmail, {
        type: 'order',
        title: `Return ${r.id} completed`,
        body: `Your refund has been processed. It may take 3-5 business days to reflect.`,
        link: '/returns',
      });
    }

    toast.success(`${r.id} completed — customer notified`, { icon: '🎉' });
    setExpanded(null);
  };

  /* ─── Export CSV ─── */
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export');
      return;
    }

    const headers = ['Return ID', 'Order ID', 'Customer', 'Email', 'Status', 'Reason', 'Items', 'Refund (KES)', 'Created'];
    const rows = filtered.map(r => {
      const total = r.items.reduce((s, i) => s + i.price * i.qty, 0);
      return [
        r.id,
        r.orderId,
        r.customerName || 'Guest',
        r.customerEmail || '',
        r.status,
        r.reason,
        r.items.length,
        total.toFixed(0),
        new Date(r.createdAt).toISOString(),
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amir-returns-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filtered.length} return${filtered.length !== 1 ? 's' : ''}`, { icon: '📥' });
  };

  /* ─── Tabs ─── */
  const tabs = [
    { id: 'pending',   label: 'Pending',   count: returnCounts.pending,   accent: 'amber' },
    { id: 'approved',  label: 'Approved',  count: returnCounts.approved,  accent: 'blue' },
    { id: 'completed', label: 'Completed', count: returnCounts.completed, accent: 'emerald' },
    { id: 'rejected',  label: 'Rejected',  count: returnCounts.rejected,  accent: 'rose' },
    { id: 'all',       label: 'All',       count: returnCounts.total,     accent: 'gray' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-8">

      {/* ═══════ HEADER ═══════ */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <RotateCcw size={26} className="text-amir-pink" />
            Returns Management
          </h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
            Review, approve, and process customer return requests
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-amir-pink hover:shadow-sm text-xs sm:text-sm font-bold text-amir-dark transition-all"
          title="Export to CSV"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* ═══════ KPI CARDS ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <KpiCard
          icon={Clock}
          label="Pending"
          value={returnCounts.pending}
          sub={returnCounts.pending > 0 ? 'Needs review' : 'All clear'}
          color="amber"
          to={() => setFilter('pending')}
          highlight={returnCounts.pending > 0}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Approved"
          value={returnCounts.approved}
          sub="Awaiting pickup"
          color="blue"
          to={() => setFilter('approved')}
        />
        <KpiCard
          icon={DollarSign}
          label="Refund Value"
          value={formatCurrency(stats.totalRefundValue)}
          sub={`${formatCurrency(stats.pendingValue)} pending`}
          color="emerald"
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg Response"
          value={stats.avgHours > 0 ? `${stats.avgHours.toFixed(1)}h` : '—'}
          sub="Time to resolve"
          color="purple"
        />
      </div>

      {/* ═══════ ALERT: PENDING ═══════ */}
      {returnCounts.pending > 0 && filter !== 'pending' && (
        <button
          onClick={() => setFilter('pending')}
          className="w-full mb-4 flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 active:scale-[0.99] transition-all animate-fade-in"
        >
          <span className="relative shrink-0">
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white animate-ping" />
            <span className="w-10 h-10 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
              <AlertTriangle size={18} />
            </span>
          </span>
          <div className="text-left flex-1 min-w-0">
            <p className="font-black text-sm sm:text-base leading-tight">
              {returnCounts.pending} return{returnCounts.pending !== 1 ? 's' : ''} waiting for review
            </p>
            <p className="text-[11px] text-white/85 leading-tight">
              Tap to review and process
            </p>
          </div>
          <ChevronDown size={18} className="-rotate-90 shrink-0" />
        </button>
      )}

      {/* ═══════ TABS ═══════ */}
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

      {/* ═══════ SEARCH + SORT ═══════ */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex-1 relative min-w-[200px]">
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

        <div className="relative shrink-0">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amir-dark/40 pointer-events-none" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="input pl-9 pr-8 py-2.5 text-xs sm:text-sm appearance-none cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest refund</option>
          </select>
        </div>
      </div>

      {/* ═══════ LIST ═══════ */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">
            {filter === 'pending' ? '🎉' : '📭'}
          </div>
          <p className="font-bold">
            {filter === 'pending' && returnCounts.pending === 0
              ? 'No pending returns — great job!'
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
              onReject={() => setRejecting(r)}
              onComplete={() => handleComplete(r)}
            />
          ))}
        </div>
      )}

      {/* ═══════ REJECT REASON MODAL ═══════ */}
      {rejecting && (
        <RejectModal
          returnReq={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => handleReject(rejecting, reason)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════════ */
function KpiCard({ icon: Icon, label, value, sub, color, to, highlight }) {
  const colors = {
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600'   },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600'    },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-600'  },
  }[color] || { bg: 'bg-gray-50', text: 'text-gray-600' };

  const Wrapper = to ? 'button' : 'div';
  const props = to ? { onClick: to, type: 'button' } : {};

  return (
    <Wrapper
      {...props}
      className={`bg-white p-3 sm:p-4 rounded-xl shadow-sm border text-left w-full transition-all ${
        highlight
          ? 'border-amber-300 ring-2 ring-amber-100'
          : 'border-gray-200'
      } ${to ? 'hover:shadow-md hover:border-amir-pink active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold truncate">
            {label}
          </p>
          <p className="text-lg sm:text-2xl font-bold mt-1 truncate text-gray-900">
            {value}
          </p>
          {sub && (
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {sub}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} flex-shrink-0`}>
          <Icon size={16} />
        </div>
      </div>
    </Wrapper>
  );
}

/* ═══════════════════════════════════════════════════
   STAFF RETURN CARD
   ═══════════════════════════════════════════════════ */
function StaffReturnCard({ returnReq, expanded, onToggle, onApprove, onReject, onComplete }) {
  const meta = STATUS_META[returnReq.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const totalRefund = returnReq.items.reduce((s, i) => s + i.price * i.qty, 0);
  const customerInitial = (returnReq.customerName || 'G').charAt(0).toUpperCase();
  const ageHours = Math.floor((Date.now() - new Date(returnReq.createdAt).getTime()) / (1000 * 60 * 60));
  const isStale = returnReq.status === 'pending' && ageHours > 24;

  return (
    <div className={`card overflow-hidden ${isStale ? 'border-l-4 border-l-rose-400' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full text-left p-3 sm:p-4 active:bg-amir-cream/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amir-pink/30 text-amir-dark flex items-center justify-center font-black text-xs shrink-0">
              {customerInitial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-black text-xs sm:text-sm font-mono truncate">
                  {returnReq.id}
                </p>
                {isStale && (
                  <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                    {ageHours}h old
                  </span>
                )}
              </div>
              <p className="text-[10px] text-amir-dark/50 font-semibold truncate">
                {returnReq.customerName || 'Guest'} · <span className="font-mono">{returnReq.orderId}</span>
              </p>
            </div>
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

        {/* Reason chip */}
        <p className="text-[11px] text-amir-dark/70 font-semibold mb-2">
          <span className="bg-amir-cream/70 px-2 py-0.5 rounded-full">
            {REASON_LABELS[returnReq.reason] || returnReq.reason}
          </span>
        </p>

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
          <div className="bg-white rounded-xl p-3 border border-amir-dark/5 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-1">
              Customer
            </p>
            <p className="text-xs font-bold">{returnReq.customerName || 'Guest'}</p>
            {returnReq.customerEmail && (
              <a
                href={`mailto:${returnReq.customerEmail}`}
                className="text-[11px] text-amir-dark/70 hover:text-amir-pink flex items-center gap-1.5 underline-offset-2 hover:underline"
              >
                <Mail size={11} className="shrink-0" /> {returnReq.customerEmail}
              </a>
            )}
            <Link
              to="/orders"
              className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-1 pt-1"
            >
              <Package size={10} /> View full order {returnReq.orderId}
            </Link>
          </div>

          {/* Reason */}
          <div className="bg-white rounded-xl p-3 border border-amir-dark/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-1">
              Reason
            </p>
            <p className="text-xs font-bold text-amir-dark">{returnReq.reason}</p>
            {returnReq.note && (
              <p className="text-[11px] text-amir-dark/70 mt-1 leading-relaxed italic">
                "{returnReq.note}"
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

          {/* Refund summary */}
          <div className="bg-white rounded-xl p-3 border border-amir-dark/5 flex items-center justify-between">
            <span className="text-xs font-semibold text-amir-dark/60">Refund amount</span>
            <span className="font-black text-base text-rose-600">{formatCurrency(totalRefund)}</span>
          </div>

          {/* ═══════════ ACTION BUTTONS ═══════════ */}
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-amir-dark/5">

            {returnReq.status === 'pending' && (
              <>
                <button
                  onClick={onApprove}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95"
                >
                  <CheckCircle2 size={14} /> Approve return
                </button>
                <button
                  onClick={onReject}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all active:scale-95"
                >
                  <XCircle size={14} /> Reject
                </button>
              </>
            )}

            {returnReq.status === 'approved' && (
              <>
                <button
                  onClick={onComplete}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs transition-all active:scale-95"
                >
                  <Truck size={14} /> Mark as completed
                </button>
                <button
                  onClick={onReject}
                  className="min-w-[90px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all active:scale-95"
                >
                  <XCircle size={14} /> Cancel
                </button>
              </>
            )}

            {returnReq.status === 'completed' && (
              <div className="flex-1 text-center py-2.5 text-xs font-bold text-emerald-600 inline-flex items-center justify-center gap-1.5">
                <CheckCircle2 size={14} /> Refund processed
              </div>
            )}

            {returnReq.status === 'rejected' && (
              <div className="flex-1 text-center py-2.5 text-xs font-bold text-rose-600 inline-flex items-center justify-center gap-1.5">
                <XCircle size={14} /> Return was rejected
              </div>
            )}
          </div>

          {/* Last updated */}
          <p className="text-[10px] text-amir-dark/40 text-center pt-1">
            Last updated {new Date(returnReq.updatedAt || returnReq.createdAt).toLocaleString([], {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   REJECT REASON MODAL
   ═══════════════════════════════════════════════════ */
function RejectModal({ returnReq, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const presets = [
    'Return window has expired',
    'Item shows signs of use or washing',
    'Original packaging is missing',
    'Item is not eligible for return',
    'Return does not match our policy',
  ];

  const finalReason = reason === 'custom' ? customReason.trim() : reason;

  const handleConfirm = () => {
    if (!finalReason) {
      toast.error('Please select or write a reason');
      return;
    }
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">

        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-black text-base">Reject return</p>
            <p className="text-[11px] text-amir-dark/50 font-mono truncate">{returnReq.id}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-9 h-9 hover:bg-rose-50 text-gray-400 hover:text-rose-500 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-[11px] text-amber-800 leading-relaxed">
              ⚠️ The customer will be notified with your reason.
              Choose carefully and professionally.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-2">
              Reason for rejection
            </label>
            <div className="space-y-1.5">
              {presets.map((p, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    reason === p
                      ? 'border-rose-300 bg-rose-50'
                      : 'border-gray-200 hover:border-rose-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={p}
                    checked={reason === p}
                    onChange={e => setReason(e.target.value)}
                    className="mt-0.5 accent-rose-500 shrink-0"
                  />
                  <span className="text-xs font-semibold text-amir-dark leading-tight">
                    {p}
                  </span>
                </label>
              ))}

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  reason === 'custom'
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-gray-200 hover:border-rose-200'
                }`}
              >
                <input
                  type="radio"
                  name="rejectReason"
                  value="custom"
                  checked={reason === 'custom'}
                  onChange={e => setReason(e.target.value)}
                  className="mt-0.5 accent-rose-500 shrink-0"
                />
                <span className="text-xs font-semibold text-amir-dark leading-tight">
                  Other (write below)
                </span>
              </label>
            </div>
          </div>

          {reason === 'custom' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                Custom reason
              </label>
              <textarea
                autoFocus
                rows={3}
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Explain why this return can't be approved..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none text-sm resize-none"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!finalReason}
              className="flex-1 py-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
            >
              <XCircle size={16} /> Reject return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}