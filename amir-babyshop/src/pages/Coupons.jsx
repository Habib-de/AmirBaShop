import { useState, useMemo } from 'react';
import {
  Ticket, Plus, Search, X, Pencil, Trash2, Save,
  CheckCircle2, XCircle, Clock, Copy, Percent,
  Truck, DollarSign, AlertCircle, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useExtras } from '../context/ExtrasContext';
import { formatCurrency } from '../utils/format';

const TYPE_META = {
  percent:  { label: 'Percentage off', icon: Percent,    color: 'pink' },
  fixed:    { label: 'Fixed amount',   icon: DollarSign, color: 'blue' },
  freeship: { label: 'Free shipping',  icon: Truck,      color: 'emerald' },
};

export default function Coupons() {
  const {
    coupons, couponsLoading,
    addCoupon, updateCoupon, deleteCoupon,
  } = useExtras();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);   // per-row pending state

  /* ─── Filtered list ─── */
  const filtered = useMemo(() => {
    let list = [...coupons];

    if (filter === 'active')   list = list.filter(c => c.active && !isExpired(c));
    if (filter === 'inactive') list = list.filter(c => !c.active);
    if (filter === 'expired')  list = list.filter(c => isExpired(c));

    const q = query.trim().toUpperCase();
    if (q) list = list.filter(c => c.code.includes(q));

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [coupons, filter, query]);

  const counts = {
    all:      coupons.length,
    active:   coupons.filter(c => c.active && !isExpired(c)).length,
    inactive: coupons.filter(c => !c.active).length,
    expired:  coupons.filter(c => isExpired(c)).length,
  };

  /* ─── Create — async ─── */
  const handleCreate = async (data) => {
    const res = await addCoupon(data);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Coupon ${res.coupon.code} created`, { icon: '🎟️' });
    setShowForm(false);
  };

  /* ─── Update — async ─── */
  const handleUpdate = async (id, data) => {
    setBusyId(id);
    const res = await updateCoupon(id, data);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Coupon updated', { icon: '✅' });
    setEditing(null);
  };

  /* ─── Delete — async ─── */
  const handleDelete = async (coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    setBusyId(coupon.id);
    const res = await deleteCoupon(coupon.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Coupon deleted', { icon: '🗑️' });
  };

  /* ─── Toggle active — async ─── */
  const handleToggle = async (coupon) => {
    setBusyId(coupon.id);
    const res = await updateCoupon(coupon.id, { active: !coupon.active });
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(coupon.active ? 'Coupon disabled' : 'Coupon enabled', { icon: '🔁' });
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}"`, { icon: '📋' });
  };

  const tabs = [
    { id: 'all',      label: 'All',      count: counts.all },
    { id: 'active',   label: 'Active',   count: counts.active },
    { id: 'inactive', label: 'Disabled', count: counts.inactive },
    { id: 'expired',  label: 'Expired',  count: counts.expired },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Ticket size={24} className="text-amir-pink" />
            Coupons
          </h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
            Create and manage discount codes
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary shrink-0 py-2.5 px-4 text-sm"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New coupon'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <CouponForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Tabs */}
      {coupons.length > 0 && (
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
      )}

      {/* Search */}
      {coupons.length > 0 && (
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amir-dark/40" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by code..."
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
      )}

      {/* Loading — first fetch */}
      {couponsLoading && coupons.length === 0 ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="mx-auto text-amir-pink animate-spin mb-3" />
          <p className="font-bold">Loading coupons…</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🎟️</div>
          <p className="font-bold">No coupons yet</p>
          <p className="text-xs text-amir-dark/60 mt-1 mb-5">
            Create your first promo code to boost sales
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex text-sm"
          >
            <Plus size={16} /> Create coupon
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-bold">No coupons found</p>
          <p className="text-xs text-amir-dark/60 mt-1">
            Try a different search or filter
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <CouponRow
              key={c.id}
              coupon={c}
              busy={busyId === c.id}
              onToggle={() => handleToggle(c)}
              onEdit={() => setEditing(c)}
              onDelete={() => handleDelete(c)}
              onCopy={() => handleCopy(c.code)}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditCouponModal
          coupon={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => handleUpdate(editing.id, data)}
        />
      )}
    </div>
  );
}

/* ─── Helper: is coupon expired ─── */
function isExpired(c) {
  return c.expiresAt && new Date(c.expiresAt) < new Date();
}

/* ─── Row ─── */
function CouponRow({ coupon, busy, onToggle, onEdit, onDelete, onCopy }) {
  const meta = TYPE_META[coupon.type] || TYPE_META.percent;
  const Icon = meta.icon;
  const expired = isExpired(coupon);
  const usedUp = coupon.maxUses > 0 && coupon.uses >= coupon.maxUses;

  const statusMeta = expired
    ? { label: 'Expired',  cls: 'bg-gray-100 text-gray-600' }
    : !coupon.active
    ? { label: 'Disabled', cls: 'bg-amber-100 text-amber-700' }
    : usedUp
    ? { label: 'Used up',  cls: 'bg-rose-100 text-rose-700' }
    : { label: 'Active',   cls: 'bg-emerald-100 text-emerald-700' };

  const colorMap = {
    pink:    { bg: 'bg-pink-50',    text: 'text-pink-600' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  };
  const c = colorMap[meta.color];

  const valueText =
    coupon.type === 'percent'  ? `${coupon.value}% off` :
    coupon.type === 'fixed'    ? `${formatCurrency(coupon.value)} off` :
    'Free shipping';

  return (
    <div className={`card p-3 sm:p-4 transition-opacity ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
          <Icon size={20} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onCopy}
              className="font-mono font-black text-sm sm:text-base tracking-wider hover:text-amir-pink transition-colors inline-flex items-center gap-1"
              title="Click to copy"
            >
              {coupon.code}
              <Copy size={11} className="text-amir-dark/40" />
            </button>
            <span className={`badge text-[9px] px-1.5 py-0.5 ${statusMeta.cls}`}>
              {statusMeta.label}
            </span>
          </div>

          <p className="text-xs font-bold text-amir-dark/80">{valueText}</p>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-amir-dark/50 font-semibold mt-1">
            {coupon.minOrder > 0 && (
              <span>Min {formatCurrency(coupon.minOrder)}</span>
            )}
            <span>
              Used {coupon.uses}
              {coupon.maxUses > 0 ? ` / ${coupon.maxUses}` : ' times'}
            </span>
            {coupon.expiresAt && (
              <span className={expired ? 'text-rose-500' : ''}>
                {expired ? 'Expired' : 'Expires'}{' '}
                {new Date(coupon.expiresAt).toLocaleDateString([], {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              coupon.active
                ? 'text-amber-500 hover:bg-amber-50'
                : 'text-emerald-500 hover:bg-emerald-50'
            }`}
            title={coupon.active ? 'Disable' : 'Enable'}
            aria-label={coupon.active ? 'Disable' : 'Enable'}
          >
            {coupon.active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          </button>
          <button
            onClick={onEdit}
            className="w-9 h-9 rounded-full flex items-center justify-center text-amir-dark/60 hover:bg-amir-pink/20 hover:text-amir-dark transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-full flex items-center justify-center text-rose-400 hover:bg-rose-50 transition-colors"
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Create Form ─── */
function CouponForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    code: '',
    type: 'percent',
    value: '',
    minOrder: '',
    maxUses: '',
    expiresAt: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const code = form.code.trim().toUpperCase();
    if (!code) return setError('Code is required');
    if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      return setError('Code must be 3-20 characters, letters and numbers only');
    }
    if (form.type !== 'freeship') {
      const val = Number(form.value);
      if (!val || val <= 0) return setError('Enter a valid value');
      if (form.type === 'percent' && val > 100) return setError('Percent cannot exceed 100');
    }

    setSubmitting(true);
    try {
      await onSave({
        code,
        type: form.type,
        value: form.type === 'freeship' ? 0 : Number(form.value),
        minOrder: Number(form.minOrder) || 0,
        maxUses: Number(form.maxUses) || 0,
        expiresAt: form.expiresAt || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="card p-4 sm:p-5 mb-5 border-l-4 border-amir-pink animate-fade-in"
    >
      <h2 className="font-black mb-4 text-base sm:text-lg flex items-center gap-2">
        🎟️ New coupon
      </h2>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
            Coupon code *
          </label>
          <input
            required
            className="input font-mono uppercase tracking-wider"
            placeholder="WELCOME10"
            maxLength={20}
            value={form.code}
            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
            Type
          </label>
          <select
            className="input"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value, value: '' })}
            disabled={submitting}
          >
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="freeship">Free shipping</option>
          </select>
        </div>

        {form.type !== 'freeship' && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
              {form.type === 'percent' ? 'Percentage (1-100) *' : 'Amount (KES) *'}
            </label>
            <input
              required
              type="number"
              min="1"
              max={form.type === 'percent' ? 100 : undefined}
              step={form.type === 'percent' ? 1 : 0.01}
              className="input"
              placeholder={form.type === 'percent' ? '10' : '200'}
              value={form.value}
              onChange={e => setForm({ ...form, value: e.target.value })}
              disabled={submitting}
            />
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
            Minimum order (optional)
          </label>
          <input
            type="number"
            min="0"
            className="input"
            placeholder="0 = no minimum"
            value={form.minOrder}
            onChange={e => setForm({ ...form, minOrder: e.target.value })}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
            Max uses (optional)
          </label>
          <input
            type="number"
            min="0"
            className="input"
            placeholder="0 = unlimited"
            value={form.maxUses}
            onChange={e => setForm({ ...form, maxUses: e.target.value })}
            disabled={submitting}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
            Expiry date (optional)
          </label>
          <input
            type="date"
            className="input"
            value={form.expiresAt}
            onChange={e => setForm({ ...form, expiresAt: e.target.value })}
            disabled={submitting}
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 shrink-0" />
          <p className="text-xs text-rose-600 font-semibold">{error}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Creating…
            </>
          ) : (
            <>
              <Plus size={16} /> Create coupon
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="btn-secondary flex-1 py-3"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ─── Edit Modal ─── */
function EditCouponModal({ coupon, onClose, onSave }) {
  const [form, setForm] = useState({
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minOrder: coupon.minOrder || '',
    maxUses: coupon.maxUses || '',
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    active: coupon.active,
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.type === 'freeship' ? 0 : Number(form.value),
        minOrder: Number(form.minOrder) || 0,
        maxUses: Number(form.maxUses) || 0,
        expiresAt: form.expiresAt || null,
        active: form.active,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-black text-base">Edit coupon</p>
            <p className="text-[11px] font-mono text-amir-dark/50 truncate">{coupon.code}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-9 h-9 hover:bg-amir-pink/20 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
              Code *
            </label>
            <input
              required
              className="input font-mono uppercase tracking-wider"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
              Type
            </label>
            <select
              className="input"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              disabled={submitting}
            >
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
              <option value="freeship">Free shipping</option>
            </select>
          </div>

          {form.type !== 'freeship' && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
                {form.type === 'percent' ? 'Percentage' : 'Amount (KES)'}
              </label>
              <input
                required
                type="number"
                min="1"
                className="input"
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
                disabled={submitting}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
                Min order
              </label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.minOrder}
                onChange={e => setForm({ ...form, minOrder: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
                Max uses
              </label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.maxUses}
                onChange={e => setForm({ ...form, maxUses: e.target.value })}
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
              Expiry
            </label>
            <input
              type="date"
              className="input"
              value={form.expiresAt}
              onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              disabled={submitting}
            />
          </div>

          <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amir-cream/60 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 accent-amir-pink"
              disabled={submitting}
            />
            <span className="text-xs font-bold text-amir-dark/80">
              Active (customers can use this coupon)
            </span>
          </label>

          <div className="flex gap-2 pt-3 border-t border-amir-dark/5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary flex-1 py-3"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save size={16} /> Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}