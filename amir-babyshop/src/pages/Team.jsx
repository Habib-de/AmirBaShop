import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserX, Clock, Search, X,
  Trash2, Mail, Shield, Store, ChevronDown, Pencil,
  Save, AlertCircle, MapPin, Phone, DollarSign, Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { userService, tenantService } from '../services/api';

const STATUS_META = {
  active:    { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700' },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700' },
  rejected:  { label: 'Rejected',  cls: 'bg-rose-100 text-rose-700' },
  suspended: { label: 'Suspended', cls: 'bg-gray-100 text-gray-700' },
};

const ROLE_META = {
  owner:    { label: 'Owner',    cls: 'bg-purple-100 text-purple-700' },
  sales:    { label: 'Sales',    cls: 'bg-emerald-100 text-emerald-700' },
  customer: { label: 'Customer', cls: 'bg-pink-100 text-pink-700' },
};

const CURRENCIES = [
  { code: 'KES', label: 'Kenyan Shilling (KSh)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'TZS', label: 'Tanzanian Shilling' },
  { code: 'UGX', label: 'Ugandan Shilling' },
];

export default function Team() {
  const { user, updateUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showShopModal, setShowShopModal] = useState(false);

  const myTenantId = user?.tenantId;
  const isOwner = user?.role === 'owner';

  /* ═══ Load team ═══ */
  const loadTeam = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const list = await userService.listTeam();
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      setLoadError(err?.message || 'Failed to load team');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeam(); }, []);

  const tenantUsers = useMemo(
    () => users.filter(u => u.tenantId === myTenantId),
    [users, myTenantId]
  );

  const filtered = useMemo(() => {
    let list = [...tenantUsers];
    if (filter !== 'all') list = list.filter(u => u.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return list;
  }, [tenantUsers, filter, query]);

  const counts = {
    all:      tenantUsers.length,
    pending:  tenantUsers.filter(u => u.status === 'pending').length,
    active:   tenantUsers.filter(u => u.status === 'active').length,
    rejected: tenantUsers.filter(u => u.status === 'rejected').length,
  };

  const tabs = [
    { id: 'pending',  label: 'Pending',  count: counts.pending },
    { id: 'active',   label: 'Active',   count: counts.active },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
    { id: 'all',      label: 'All',      count: counts.all },
  ];

  /* ═══ Actions ═══ */
  const handleApprove = async (u) => {
    setBusyId(u.id);
    try {
      const updated = await userService.approve(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      toast.success(`${u.name} approved!`, { icon: '✅' });
      setExpanded(null);
    } catch (err) {
      toast.error(err?.message || 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (u) => {
    if (!confirm(`Reject ${u.name}'s request?`)) return;
    setBusyId(u.id);
    try {
      const updated = await userService.reject(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      toast.error(`${u.name} rejected`, { icon: '❌' });
      setExpanded(null);
    } catch (err) {
      toast.error(err?.message || 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (u) => {
    if (u.role === 'owner') {
      toast.error('You cannot delete the shop owner');
      return;
    }
    if (!confirm(`Delete ${u.name} permanently?`)) return;
    setBusyId(u.id);
    try {
      await userService.remove(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success('User deleted', { icon: '🗑️' });
      setExpanded(null);
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Users size={24} className="text-amir-pink" />
            Team
          </h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold truncate">
            {filtered[0]?.tenantName
              ? `Manage users of ${filtered[0].tenantName}`
              : 'Manage users of your shop'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isOwner && (
            <button
              onClick={() => setShowShopModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-amir-pink hover:shadow-sm text-amir-dark font-bold text-xs transition-colors"
              title="Edit shop"
            >
              <Store size={14} /> Edit shop
            </button>
          )}
          <button
            onClick={loadTeam}
            disabled={loading}
            className="text-xs font-bold text-amir-dark/60 hover:text-amir-dark px-3 py-2 rounded-full hover:bg-amir-pink/20 transition-colors disabled:opacity-40"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
          <span className="text-rose-500 text-lg">⚠️</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-rose-700">Could not load team</p>
            <p className="text-[11px] text-rose-600 truncate">{loadError}</p>
          </div>
          <button
            onClick={loadTeam}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Pending alert */}
      {counts.pending > 0 && filter !== 'pending' && (
        <button
          onClick={() => setFilter('pending')}
          className="w-full mb-4 flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 active:scale-[0.99] transition-all animate-fade-in"
        >
          <span className="relative shrink-0">
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white animate-ping" />
            <span className="w-9 h-9 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
              <Clock size={18} />
            </span>
          </span>
          <div className="text-left flex-1 min-w-0">
            <p className="font-black text-sm sm:text-base leading-tight">
              {counts.pending} pending approval{counts.pending !== 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-white/85 leading-tight">
              Tap to review and approve
            </p>
          </div>
        </button>
      )}

      {/* Status tabs */}
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
          placeholder="Search by name, email, or role..."
          className="input pl-11 pr-11"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-amir-dark/40 hover:text-amir-dark hover:bg-amir-pink/20"
            aria-label="Clear"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3 animate-pulse">👥</div>
          <p className="font-bold text-amir-dark/60">Loading team…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">
            {filter === 'pending' ? '🎉' : '👥'}
          </div>
          <p className="font-bold">
            {filter === 'pending' && counts.pending === 0
              ? 'No pending requests'
              : 'No users found'}
          </p>
          <p className="text-xs text-amir-dark/60 mt-1">
            {filter === 'pending'
              ? 'New staff registrations will appear here'
              : query
              ? 'Try a different search'
              : 'Nothing to show here yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const statusMeta = STATUS_META[u.status] || STATUS_META.active;
            const roleMeta = ROLE_META[u.role] || ROLE_META.customer;
            const isOpen = expanded === u.id;
            const isMe = u.id === user?.id;
            const isBusy = busyId === u.id;
            const initial = (u.name || '?').charAt(0).toUpperCase();

            return (
              <div key={u.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

                <button
                  onClick={() => setExpanded(isOpen ? null : u.id)}
                  className="w-full text-left p-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${
                    u.role === 'owner' ? 'bg-amir-purple' :
                    u.role === 'sales' ? 'bg-emerald-500' :
                    'bg-amir-pink'
                  }`}>
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {u.name}
                      {isMe && <span className="text-[10px] text-gray-400 ml-1">(you)</span>}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`badge text-[9px] px-1.5 py-0.5 ${roleMeta.cls}`}>
                      {roleMeta.label}
                    </span>
                    <span className={`badge text-[9px] px-1.5 py-0.5 ${statusMeta.cls}`}>
                      {statusMeta.label}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-3 bg-gray-50/50 animate-fade-in space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-100 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Details
                      </p>
                      <p className="text-xs text-gray-700 flex items-center gap-2">
                        <Mail size={12} className="text-gray-400 shrink-0" />
                        {u.email}
                      </p>
                      <p className="text-xs text-gray-700 flex items-center gap-2">
                        <Shield size={12} className="text-gray-400 shrink-0" />
                        <span className="capitalize">{u.role}</span>
                      </p>
                      <p className="text-xs text-gray-700 flex items-center gap-2">
                        <Store size={12} className="text-gray-400 shrink-0" />
                        {u.tenantName || u.tenantId || '—'}
                      </p>
                      {u.createdAt && (
                        <p className="text-[10px] text-gray-400">
                          Registered {new Date(u.createdAt).toLocaleDateString([], {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>

                    {isMe && (
                      <Link
                        to="/profile"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-xs transition-all active:scale-95"
                      >
                        <Pencil size={14} /> Edit my profile
                      </Link>
                    )}

                    {u.status === 'pending' && !isMe && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleApprove(u)}
                          disabled={isBusy}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          <UserCheck size={14} /> {isBusy ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(u)}
                          disabled={isBusy}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          <UserX size={14} /> Reject
                        </button>
                      </div>
                    )}

                    {u.status === 'rejected' && !isMe && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleApprove(u)}
                          disabled={isBusy}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          <UserCheck size={14} /> Approve now
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isBusy}
                          className="w-10 h-10 rounded-full bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors disabled:opacity-50"
                          aria-label="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}

                    {u.status === 'active' && u.role !== 'owner' && !isMe && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isBusy}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 size={14} /> Remove from shop
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Shop Modal */}
      {showShopModal && (
        <EditShopModal
          onClose={() => setShowShopModal(false)}
          onSaved={(updatedTenant) => {
            setShowShopModal(false);
            // Refresh team to pick up new tenantName (via /users endpoint)
            loadTeam();
            // Also update AuthContext so header etc. reflect new name
            if (updatedTenant?.name) {
              updateUser(user.id, { name: user.name }).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT SHOP MODAL
   ═══════════════════════════════════════════════════════════ */
function EditShopModal({ onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    addressStreet: '',
    addressCity: '',
    addressCountry: 'Kenya',
    currency: 'KES',
    logoUrl: '',
    description: '',
    lat: '',
    lng: '',
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tenantService.me()
      .then((t) => {
        if (cancelled) return;
        setForm({
          name: t.name || '',
          phone: t.phone || '',
          email: t.email || '',
          addressStreet: t.addressStreet || '',
          addressCity: t.addressCity || '',
          addressCountry: t.addressCountry || 'Kenya',
          currency: t.currency || 'KES',
          logoUrl: t.logoUrl || '',
          description: t.description || '',
          lat: t.lat ?? '',
          lng: t.lng ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load shop');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Shop name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        addressStreet: form.addressStreet.trim() || null,
        addressCity: form.addressCity.trim() || null,
        addressCountry: form.addressCountry.trim() || 'Kenya',
        currency: form.currency,
        logoUrl: form.logoUrl.trim() || null,
        description: form.description.trim() || null,
        lat: form.lat === '' ? null : Number(form.lat),
        lng: form.lng === '' ? null : Number(form.lng),
      };

      const updated = await tenantService.updateMe(payload);
      toast.success('Shop updated!', { icon: '🏪' });
      onSaved?.(updated);
    } catch (err) {
      setError(err?.message || 'Failed to save shop');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-slide-up">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="font-black text-base flex items-center gap-2">
              <Store size={18} className="text-amir-pink" />
              Edit shop
            </p>
            <p className="text-[11px] text-amir-dark/50">
              Update your shop's public information
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-9 h-9 hover:bg-rose-50 text-gray-400 hover:text-rose-500 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3 animate-pulse">🏪</div>
            <p className="font-bold text-amir-dark/60">Loading shop…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertCircle size={14} className="text-rose-500 shrink-0" />
                <p className="text-xs text-rose-600">{error}</p>
              </div>
            )}

            {/* Shop name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                Shop name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                className="input"
                placeholder="e.g. AMIR BabyShop"
                maxLength={120}
              />
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                <ImageIcon size={11} className="inline mr-1" /> Logo URL
              </label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={e => setField('logoUrl', e.target.value)}
                className="input"
                placeholder="https://example.com/logo.png"
                maxLength={500}
              />
              {form.logoUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="w-12 h-12 rounded-lg object-contain bg-gray-50 border border-gray-200"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-[10px] text-amir-dark/50">Preview</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={2}
                maxLength={2000}
                className="input resize-none"
                placeholder="Tell customers about your shop…"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                  <Phone size={11} className="inline mr-1" /> Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  className="input"
                  placeholder="+254 700 123 456"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                  <Mail size={11} className="inline mr-1" /> Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  className="input"
                  placeholder="hello@yourshop.com"
                  maxLength={190}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                <MapPin size={11} className="inline mr-1" /> Street address
              </label>
              <input
                type="text"
                value={form.addressStreet}
                onChange={e => setField('addressStreet', e.target.value)}
                className="input"
                placeholder="Markiti"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={form.addressCity}
                onChange={e => setField('addressCity', e.target.value)}
                className="input"
                placeholder="City"
                maxLength={100}
              />
              <input
                type="text"
                value={form.addressCountry}
                onChange={e => setField('addressCountry', e.target.value)}
                className="input"
                placeholder="Country"
                maxLength={60}
              />
            </div>

            {/* Coords */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.0000001"
                value={form.lat}
                onChange={e => setField('lat', e.target.value)}
                className="input"
                placeholder="Latitude (opt)"
              />
              <input
                type="number"
                step="0.0000001"
                value={form.lng}
                onChange={e => setField('lng', e.target.value)}
                className="input"
                placeholder="Longitude (opt)"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                <DollarSign size={11} className="inline mr-1" /> Default currency
              </label>
              <select
                value={form.currency}
                onChange={e => setField('currency', e.target.value)}
                className="input"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Save */}
            <div className="flex gap-2 pt-3 border-t border-amir-dark/5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-amir-dark border-t-transparent animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}