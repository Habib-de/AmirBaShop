import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Save,
  AlertCircle, Shield, Store, LogOut,
  Pencil, KeyRound, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { tenantService } from '../services/api';
import EnablePushButton from '../components/UI/EnablePushButton';

export default function Profile() {
  const { user, logout, updateUser, changePassword } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('info');
  const [tenant, setTenant] = useState(null);

  /* ═══ Load tenant info (for shop badge) ═══ */
  useEffect(() => {
    let cancelled = false;
    if (!user?.tenantId) return;
    tenantService.me()
      .then((t) => { if (!cancelled) setTenant(t); })
      .catch(() => { if (!cancelled) setTenant(null); });
    return () => { cancelled = true; };
  }, [user?.tenantId]);

  /* ═══ Not logged in ═══ */
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-xl font-black mb-3">Sign in to view your profile</h1>
        <Link to="/login" className="btn-primary inline-flex">Sign in</Link>
      </div>
    );
  }

  const roleMeta = {
    owner:    { label: 'Owner',    cls: 'bg-purple-100 text-purple-700' },
    sales:    { label: 'Sales',    cls: 'bg-emerald-100 text-emerald-700' },
    customer: { label: 'Customer', cls: 'bg-pink-100 text-pink-700' },
  }[user.role] || { label: 'User', cls: 'bg-gray-100 text-gray-700' };

  const isCustomer = user.role === 'customer';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-8">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <User size={24} className="text-amir-pink" />
          My Profile
        </h1>
        <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
          Manage your account details
        </p>
      </div>

      {/* Profile card */}
      <div className="card p-5 sm:p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-black text-2xl text-white shrink-0 ${
            user.role === 'owner' ? 'bg-amir-purple' :
            user.role === 'sales' ? 'bg-emerald-500' :
            'bg-amir-pink'
          }`}>
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-black text-lg sm:text-xl text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className={`badge text-[10px] px-2 py-0.5 ${roleMeta.cls}`}>
                {roleMeta.label}
              </span>
              {tenant?.name && (
                <span className="badge text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                  <Store size={10} /> {tenant.name}
                </span>
              )}
              {user.phone && (
                <span className="badge text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                  <Phone size={10} /> {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Baby Registry quick access — customers only */}
      {isCustomer && (
        <Link
          to="/my-registry"
          className="card p-4 mb-5 flex items-center gap-3 hover:border-amir-pink transition-colors active:scale-[0.99]"
        >
          <span className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center text-xl shrink-0">
            🍼
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-gray-900">My Baby Registry</p>
            <p className="text-[11px] text-gray-500">
              Create a registry, share with friends & track gifts
            </p>
          </div>
          <ChevronRight size={18} className="text-gray-400 shrink-0" />
        </Link>
      )}

            {/* Push Notifications */}
      <div className="card p-4 mb-5 flex items-center gap-3">
        <span className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
          🔔
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-gray-900">Push Notifications</p>
          <p className="text-[11px] text-gray-500">
            Get order updates and promos directly on your device
          </p>
        </div>
        <div className="shrink-0">
          <EnablePushButton compact />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setTab('info')}
          className={`px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-colors ${
            tab === 'info'
              ? 'bg-amir-pink text-amir-dark shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-amir-dark hover:bg-amir-pink/10'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Pencil size={13} /> Edit info
          </span>
        </button>
        <button
          onClick={() => setTab('password')}
          className={`px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-colors ${
            tab === 'password'
              ? 'bg-amir-pink text-amir-dark shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-amir-dark hover:bg-amir-pink/10'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <KeyRound size={13} /> Change password
          </span>
        </button>
      </div>

      {/* Content */}
      {tab === 'info' ? (
        <InfoForm
          user={user}
          onSave={async (patch) => {
            // New AuthContext: updateUser(patch) only — no id arg
            const res = await updateUser(user.id, patch);
            if (res?.ok === false) {
              return { ok: false, error: res.error };
            }
            toast.success('Profile updated', { icon: '✅' });
            return { ok: true };
          }}
        />
      ) : (
        <PasswordForm
          onSubmit={async (currentPwd, newPwd) => {
            // New AuthContext: changePassword(current, newPassword) only
            const res = await changePassword(user.id, currentPwd, newPwd);
            if (res?.ok === false) {
              return { ok: false, error: res.error };
            }
            toast.success('Password changed', { icon: '🔐' });
            return { ok: true };
          }}
        />
      )}

      {/* Danger zone */}
      <div className="card p-4 mt-5 border-l-4 border-l-rose-300">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900">Sign out of this device</p>
            <p className="text-[11px] text-gray-500">You can sign back in anytime</p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Info Form
   ═══════════════════════════════════════════════════════════ */
function InfoForm({ user, onSave }) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) return setError('Name cannot be empty');
    if (trimmedName.length < 2) return setError('Name is too short');

    const patch = {};
    if (trimmedName !== user.name) patch.name = trimmedName;
    if (trimmedPhone !== (user.phone || '')) patch.phone = trimmedPhone;

    if (Object.keys(patch).length === 0) {
      return setError('Nothing changed');
    }

    setSaving(true);
    try {
      const res = await onSave(patch);
      if (res?.ok === false) {
        setError(res.error || 'Update failed');
      }
    } catch (err) {
      setError(err?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          Full Name
        </label>
        <div className="relative">
          <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
            placeholder="Your full name"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-100 bg-gray-50 rounded-lg outline-none text-sm font-medium text-gray-500 cursor-not-allowed"
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          Email cannot be changed here. Contact support if you need to update it.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          Phone Number
        </label>
        <div className="relative">
          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
            placeholder="+254 700 123 456"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 shrink-0" />
          <p className="text-xs text-rose-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-all active:scale-[0.99] inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
      >
        {saving ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-amir-dark border-t-transparent animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Save size={15} /> Save changes
          </>
        )}
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   Password Form
   ═══════════════════════════════════════════════════════════ */
function PasswordForm({ onSubmit }) {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!current) return setError('Enter your current password');
    if (!newPwd) return setError('Enter a new password');
    if (newPwd.length < 6) return setError('Password must be at least 6 characters');
    if (newPwd !== confirm) return setError('Passwords do not match');
    if (newPwd === current) return setError('New password must be different');

    setSaving(true);
    try {
      const res = await onSubmit(current, newPwd);
      if (res?.ok === false) {
        setError(res.error || 'Password change failed');
        return;
      }
      setCurrent('');
      setNewPwd('');
      setConfirm('');
    } catch (err) {
      setError(err?.message || 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          Current Password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
            placeholder="Enter current password"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          New Password
        </label>
        <div className="relative">
          <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showNew ? 'text' : 'password'}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-amir-pink/40 focus:border-amir-pink"
            placeholder="Re-enter new password"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={14} className="text-rose-500 shrink-0" />
          <p className="text-xs text-rose-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-all active:scale-[0.99] inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
      >
        {saving ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-amir-dark border-t-transparent animate-spin" />
            Changing…
          </>
        ) : (
          <>
            <Save size={15} /> Change password
          </>
        )}
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
        <p className="text-[11px] text-amber-700 leading-relaxed">
          💡 <strong>Tip:</strong> Use a strong password — 8+ characters with a mix of letters and numbers.
        </p>
      </div>
    </form>
  );
}