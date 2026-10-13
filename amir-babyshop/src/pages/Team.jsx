import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserX, Clock, Search, X, CheckCircle2,
  Trash2, Mail, Shield, Store, AlertCircle, ChevronDown,
  Pencil, Eye, EyeOff, Save, KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const STATUS_META = {
  active:   { label: 'Active',   cls: 'bg-emerald-100 text-emerald-700' },
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700' },
};

const ROLE_META = {
  owner:    { label: 'Owner',    cls: 'bg-purple-100 text-purple-700' },
  sales:    { label: 'Sales',    cls: 'bg-emerald-100 text-emerald-700' },
  customer: { label: 'Customer', cls: 'bg-pink-100 text-pink-700' },
};

export default function Team() {
  const {
    user, users, tenants,
    approveUser, rejectUser, deleteUser, updateUser,
  } = useAuth();

  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [editingSelf, setEditingSelf] = useState(false);

  // Only users in the owner's tenant
  const myTenantId = user?.tenantId;
  const myTenant = tenants.find(t => t.id === myTenantId);

  const tenantUsers = useMemo(() => {
    return users.filter(u => u.tenantId === myTenantId);
  }, [users, myTenantId]);

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
    // Sort: pending first, then by createdAt desc
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

  const handleApprove = (u) => {
    approveUser(u.id);
    toast.success(`${u.name} approved!`, { icon: '✅' });
    setExpanded(null);
  };

  const handleReject = (u) => {
    if (confirm(`Reject ${u.name}'s request?`)) {
      rejectUser(u.id);
      toast.error(`${u.name} rejected`, { icon: '❌' });
      setExpanded(null);
    }
  };

  const handleDelete = (u) => {
    if (u.role === 'owner') {
      toast.error('You cannot delete the shop owner');
      return;
    }
    if (confirm(`Delete ${u.name} permanently?`)) {
      deleteUser(u.id);
      toast.success('User deleted', { icon: '🗑️' });
      setExpanded(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <Users size={24} className="text-amir-pink" />
          Team
        </h1>
        <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
          Manage users of {myTenant?.name || 'your shop'}
        </p>
      </div>

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

      {/* User list */}
      {filtered.length === 0 ? (
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
            const initial = (u.name || '?').charAt(0).toUpperCase();

            return (
              <div key={u.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

                {/* Tappable header */}
                <button
                  onClick={() => {
                    setExpanded(isOpen ? null : u.id);
                    if (isOpen) setEditingSelf(false);
                  }}
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
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-gray-900 truncate">
                        {u.name}
                        {isMe && <span className="text-[10px] text-gray-400 ml-1">(you)</span>}
                      </p>
                    </div>
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

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-3 bg-gray-50/50 animate-fade-in space-y-3">

                    {/* Info grid */}
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
                        {myTenant?.name}
                      </p>
                      {u.createdAt && (
                        <p className="text-[10px] text-gray-400">
                          Registered {new Date(u.createdAt).toLocaleDateString([], {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>

                    {/* ─── OWNER EDITING THEMSELVES ─── */}
                    {isMe && (
                      <>
                        {!editingSelf ? (
                          <button
                            onClick={() => setEditingSelf(true)}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-xs transition-all active:scale-95"
                          >
                            <Pencil size={14} /> Edit my profile
                          </button>
                        ) : (
                          <EditSelfForm
                            user={u}
                            onSave={(patch) => {
                              updateUser(u.id, patch);
                              toast.success('Profile updated', { icon: '✅' });
                              setEditingSelf(false);
                            }}
                            onCancel={() => setEditingSelf(false)}
                          />
                        )}
                      </>
                    )}

                    {/* Pending — approve/reject */}
                    {u.status === 'pending' && !isMe && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleApprove(u)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95"
                        >
                          <UserCheck size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(u)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all active:scale-95"
                        >
                          <UserX size={14} /> Reject
                        </button>
                      </div>
                    )}

                    {/* Rejected — allow re-approve or delete */}
                    {u.status === 'rejected' && !isMe && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleApprove(u)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95"
                        >
                          <UserCheck size={14} /> Approve now
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="w-10 h-10 rounded-full bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          aria-label="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}

                    {/* Active non-owner — allow delete */}
                    {u.status === 'active' && u.role !== 'owner' && !isMe && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleDelete(u)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all active:scale-95"
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

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Edit-Self Form — name + password
   ═══════════════════════════════════════════════════════════ */
function EditSelfForm({ user, onSave, onCancel }) {
  const [name, setName] = useState(user.name || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const patch = {};

    // Name change
    const trimmedName = name.trim();
    if (!trimmedName) {
      return setError('Name cannot be empty');
    }
    if (trimmedName !== user.name) {
      patch.name = trimmedName;
    }

    // Password change — only if any password field has something
    const wantsPasswordChange = currentPwd || newPwd || confirmPwd;

    if (wantsPasswordChange) {
      if (!currentPwd) return setError('Enter your current password');
      if (currentPwd !== user.password) return setError('Current password is incorrect');
      if (!newPwd) return setError('Enter a new password');
      if (newPwd.length < 6) return setError('New password must be at least 6 characters');
      if (newPwd !== confirmPwd) return setError('New passwords do not match');
      if (newPwd === currentPwd) return setError('New password must be different');
      patch.password = newPwd;
    }

    if (Object.keys(patch).length === 0) {
      return setError('Nothing to update');
    }

    onSave(patch);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg p-3 border border-amir-pink/30 space-y-3"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60">
        Edit my profile
      </p>

      {/* Name */}
      <div>
        <label className="block text-[10px] font-bold text-gray-600 mb-1">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
          placeholder="Your name"
        />
      </div>

      {/* Password section */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
          <KeyRound size={10} /> Change password (optional)
        </p>

        <div className="space-y-2">
          {/* Current password */}
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full px-3 pr-10 py-2 border border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
              placeholder="Current password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* New password */}
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full px-3 pr-10 py-2 border border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
              placeholder="New password (min 6 chars)"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full px-3 pr-10 py-2 border border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={12} className="text-rose-500 shrink-0" />
          <p className="text-[11px] text-rose-600">{error}</p>
        </div>
      )}

      <div className="flex gap-1.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95"
        >
          <Save size={14} /> Save
        </button>
      </div>
    </form>
  );
}