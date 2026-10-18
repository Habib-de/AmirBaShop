import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2,
  Store, Users, ShieldCheck, ChevronDown, ChevronRight, ChevronLeft,
  Phone, MapPin, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenantService } from '../services/api';

const ROLES = [
  {
    id: 'customer',
    icon: Users,
    label: 'Customer',
    desc: 'Shop from an existing baby shop',
    color: 'pink',
    note: '📱 You can start shopping immediately after registering.',
  },
  {
    id: 'sales',
    icon: Store,
    label: 'Sales Staff',
    desc: 'Join an existing shop as staff (needs approval)',
    color: 'mint',
    note: '⏳ Your account will be pending owner approval.',
  },
  {
    id: 'owner',
    icon: ShieldCheck,
    label: 'Shop Owner',
    desc: 'Create your own baby shop',
    color: 'purple',
    note: '👑 You\'ll be the owner. You can add staff and manage your shop.',
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    shopName: '',
    tenantId: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  /* ─── Shop list (loaded from backend) ─── */
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  const activeRole = ROLES.find(r => r.id === role);

  const colorMap = {
    pink:   { primary: 'from-pink-400 to-pink-500',     text: 'text-pink-600',    ring: 'focus:ring-pink-400',    btn: 'bg-amir-pink hover:bg-pink-400 text-amir-dark' },
    mint:   { primary: 'from-emerald-400 to-emerald-500', text: 'text-emerald-600', ring: 'focus:ring-emerald-400', btn: 'bg-amir-mint hover:bg-emerald-300 text-emerald-900' },
    purple: { primary: 'from-purple-400 to-purple-500',  text: 'text-purple-600',  ring: 'focus:ring-purple-400',  btn: 'bg-amir-purple hover:bg-purple-400 text-amir-dark' },
  }[activeRole?.color] || {
    primary: 'from-pink-400 to-pink-500',
    text: 'text-pink-600',
    ring: 'focus:ring-pink-400',
    btn: 'bg-amir-pink hover:bg-pink-400 text-amir-dark',
  };

  const steps = [
    { id: 1, label: 'Personal Info', icon: User },
    { id: 2, label: 'Security',      icon: Lock },
    { id: 3, label: 'Account',       icon: ShieldCheck },
  ];

  /* ═══ Load shops from backend ═══ */
  useEffect(() => {
    let cancelled = false;
    setTenantsLoading(true);
    tenantService.list()
      .then((list) => { if (!cancelled) setTenants(list || []); })
      .catch(() => { if (!cancelled) setTenants([]); })
      .finally(() => { if (!cancelled) setTenantsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* ─── Step validation ─── */
  const validateStep = () => {
    if (currentStep === 1) {
      if (!form.name.trim()) { setError('Full name is required'); return false; }
      if (!form.email.trim()) { setError('Email is required'); return false; }
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Enter a valid email'); return false; }
      if (!form.phone.trim()) { setError('Phone number is required'); return false; }
      return true;
    }
    if (currentStep === 2) {
      if (!form.password) { setError('Password is required'); return false; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters'); return false; }
      if (form.password !== form.confirm) { setError('Passwords do not match'); return false; }
      return true;
    }
    if (currentStep === 3) {
      if (role === 'owner') {
        if (!form.shopName.trim()) { setError('Shop name is required'); return false; }
      }
      if (role === 'customer' || role === 'sales') {
        if (!form.tenantId) { setError('Please select a shop'); return false; }
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep()) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  /* ═══ Async submit → backend ═══ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateStep()) return;

    try {
      const res = await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        role,
        shopName: form.shopName,
        tenantId: form.tenantId,
      });

      if (!res.ok) return setError(res.error);

      setSuccess({
        requiresApproval: res.requiresApproval,
        role,
      });
    } catch (err) {
      setError(err?.message || 'Registration failed');
    }
  };

  /* ═══════════════════════════════════════════
     SUCCESS SCREEN
     ═══════════════════════════════════════════ */
  if (success) {
    const isPending = success.requiresApproval;

    return (
      <div className="h-screen w-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-3 fixed inset-0">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-4 text-center border-b border-gray-300">
              <div className="flex justify-center">
                <img src="/logo3.png" alt="AMIR BabyShop" className="w-full max-w-[140px] h-auto object-contain mx-auto" />
              </div>
            </div>

            <div className="p-6 text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isPending ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                {isPending ? (
                  <Clock size={32} className="text-amber-600" />
                ) : (
                  <CheckCircle2 size={32} className="text-emerald-600" />
                )}
              </div>

              <h2 className="text-lg font-black text-gray-900 mb-2">
                {isPending ? 'Waiting for approval' : 'Account created!'}
              </h2>

              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                {isPending
                  ? 'Your account is pending approval from the shop owner. You\'ll be able to sign in once they activate your account.'
                  : role === 'owner'
                  ? 'Your shop is ready! Sign in to start managing your store.'
                  : 'Welcome! You can now sign in and start shopping.'}
              </p>

              {isPending && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-left">
                  <p className="text-xs font-bold text-amber-800 mb-1">⏳ What happens next?</p>
                  <ul className="text-[11px] text-amber-700 space-y-1">
                    <li>• The shop owner receives your request</li>
                    <li>• They'll approve or reject your account</li>
                    <li>• Once approved, you can sign in</li>
                  </ul>
                </div>
              )}

              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full py-3"
              >
                Go to Sign In
              </button>
            </div>

            <div className="text-center pb-3">
              <p className="text-[10px] text-gray-400">
                © {new Date().getFullYear()} AMIR BabyShop. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     FORM
     ═══════════════════════════════════════════ */
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-3 fixed inset-0 overflow-y-auto">
      <div className="w-full max-w-sm my-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* HEADER */}
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-4 text-center border-b border-gray-300 relative">
            <Link
              to="/login"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="flex justify-center">
              <img src="/logo3.png" alt="AMIR BabyShop" className="w-full max-w-[120px] h-auto object-contain mx-auto" />
            </div>
            <div className="mt-1">
              <p className="text-gray-600 text-[10px] font-bold italic tracking-wide">
                Create Account
              </p>
            </div>
          </div>

          {/* STEP PROGRESS */}
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const done = currentStep > step.id;
                const active = currentStep === step.id;
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          active
                            ? `bg-gradient-to-br ${colorMap.primary} text-white ring-4 ring-pink-100`
                            : done
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {done ? <CheckCircle2 size={14} /> : step.id}
                      </div>
                      <span className={`text-[8px] mt-1 font-semibold ${
                        active ? colorMap.text : done ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 transition-colors ${
                        currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* FORM BODY */}
          <div className="p-4">
            <div className="text-center mb-3">
              <h2 className="text-sm font-bold text-gray-800">
                Step {currentStep} of 3: {steps[currentStep - 1].label}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* ═══════ STEP 1: PERSONAL INFO ═══════ */}
              {currentStep === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/50 hover:bg-white focus:bg-white`}
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/50 hover:bg-white focus:bg-white`}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/50 hover:bg-white focus:bg-white`}
                        placeholder="+254 700 123 456"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle size={14} className="text-red-500 shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    className={`w-full py-3 rounded-full font-bold text-sm transition-all active:scale-[0.99] inline-flex items-center justify-center gap-1.5 ${colorMap.btn}`}
                  >
                    Next Step <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* ═══════ STEP 2: SECURITY ═══════ */}
              {currentStep === 2 && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className={`w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/50 hover:bg-white focus:bg-white`}
                        placeholder="Min 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                        className={`w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/50 hover:bg-white focus:bg-white`}
                        placeholder="Re-enter password"
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
                    <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle size={14} className="text-red-500 shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-bold text-sm transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className={`flex-1 py-3 rounded-full font-bold text-sm transition-all active:scale-[0.99] inline-flex items-center justify-center gap-1.5 ${colorMap.btn}`}
                    >
                      Next Step <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}

              {/* ═══════ STEP 3: ACCOUNT TYPE ═══════ */}
              {currentStep === 3 && (
                <>
                  {/* Role picker */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Account Type *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map(r => {
                        const Icon = r.icon;
                        const active = role === r.id;
                        const c = {
                          pink:   'border-pink-400 bg-pink-50 text-pink-600',
                          mint:   'border-emerald-400 bg-emerald-50 text-emerald-600',
                          purple: 'border-purple-400 bg-purple-50 text-purple-600',
                        }[r.color];
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => { setRole(r.id); setError(''); }}
                            className={`flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-xl border-2 transition-all ${
                              active ? c : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <Icon size={16} />
                            <span className="text-[9px] font-bold leading-tight text-center">
                              {r.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Role description */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      {activeRole?.note}
                    </p>
                  </div>

                  {/* OWNER — shop name */}
                  {role === 'owner' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                      <p className="text-[11px] font-bold text-purple-700">🏪 Set up your shop</p>
                      <div className="relative">
                        <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                        <input
                          type="text"
                          value={form.shopName}
                          onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 border-2 border-purple-200 rounded-lg outline-none text-sm font-medium focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                          placeholder="e.g., Little Stars Baby Shop"
                        />
                      </div>
                      <p className="text-[10px] text-purple-600">
                        We'll create your shop instantly and you'll be its owner.
                      </p>
                    </div>
                  )}

                  {/* CUSTOMER or SALES — pick shop */}
                  {(role === 'customer' || role === 'sales') && (
                    <div className={`rounded-xl p-3 space-y-2 border ${
                      role === 'sales'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-pink-50 border-pink-200'
                    }`}>
                      <p className={`text-[11px] font-bold ${
                        role === 'sales' ? 'text-emerald-700' : 'text-pink-700'
                      }`}>
                        {role === 'sales' ? '🏪 Shop you want to join' : '🏪 Shop you are shopping at'}
                      </p>
                      <div className="relative">
                        <Store size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                          role === 'sales' ? 'text-emerald-400' : 'text-pink-400'
                        }`} />
                        <select
                          value={form.tenantId}
                          onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                          disabled={tenantsLoading}
                          className={`w-full pl-9 pr-8 py-2.5 border-2 rounded-lg outline-none text-sm font-medium appearance-none cursor-pointer bg-white disabled:opacity-60 ${
                            role === 'sales'
                              ? 'border-emerald-200 focus:ring-2 focus:ring-emerald-400'
                              : 'border-pink-200 focus:ring-2 focus:ring-pink-400'
                          } focus:border-transparent`}
                        >
                          <option value="">
                            {tenantsLoading
                              ? 'Loading shops…'
                              : tenants.length === 0
                              ? 'No shops yet — an owner must create one first'
                              : '— Select a shop —'}
                          </option>
                          {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      <p className={`text-[10px] ${
                        role === 'sales' ? 'text-emerald-600' : 'text-pink-600'
                      }`}>
                        {role === 'sales'
                          ? 'Your account will be pending until the shop owner approves it.'
                          : 'You can start shopping immediately.'}
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle size={14} className="text-red-500 shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-bold text-sm transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 py-3 rounded-full font-bold text-sm transition-all active:scale-[0.99] inline-flex items-center justify-center gap-1.5 ${colorMap.btn}`}
                    >
                      Create Account
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-pink-600 hover:text-pink-700 font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <div className="text-center pb-3">
            <p className="text-[10px] text-gray-400">
              © {new Date().getFullYear()} AMIR BabyShop. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}