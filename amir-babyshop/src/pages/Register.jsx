import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2,
  Store, Users, ShieldCheck, ChevronDown, ChevronRight, ChevronLeft,
  Phone, Clock, Baby, Heart, Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenantService } from '../services/api';

/* Background photo, desktop screens only (phones get the soft pink gradient).
   File lives in your project at public/back.jpeg and is served from /back.jpeg. */
const BG_IMAGE = '/back1.jpg';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.auth-root {
  font-family: 'Nunito', ui-sans-serif, system-ui, sans-serif;
  background-image: linear-gradient(135deg, #fdf2f8, #ffffff, #faf5ff);
}
@media (min-width: 768px) {
  .auth-root {
    background-image:
      linear-gradient(rgba(253,242,248,0.35), rgba(250,245,255,0.4)),
      url(${BG_IMAGE}),
      linear-gradient(135deg, #fdf2f8, #ffffff, #faf5ff);
  }
}
.auth-root input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 40px #fff inset;
  -webkit-text-fill-color: #1f2937;
  border-radius: 0.5rem;
}

/* Resting shapes of the grey panel */
.panel-register { clip-path: polygon(0 0, 52% 0, 30% 100%, 0 100%); }
.panel-login    { clip-path: polygon(48% 0, 100% 0, 100% 100%, 70% 100%); }

/* Leaving: panel grows to cover the card. Entering: it shrinks from full cover to its side. */
@keyframes loginToCover    { from { clip-path: polygon(48% 0,100% 0,100% 100%,70% 100%); } to { clip-path: polygon(0 0,100% 0,100% 100%,0 100%); } }
@keyframes registerToCover { from { clip-path: polygon(0 0,52% 0,30% 100%,0 100%); }       to { clip-path: polygon(0 0,100% 0,100% 100%,0 100%); } }
@keyframes coverToLogin    { from { clip-path: polygon(0 0,100% 0,100% 100%,0 100%); }     to { clip-path: polygon(48% 0,100% 0,100% 100%,70% 100%); } }
@keyframes coverToRegister { from { clip-path: polygon(0 0,100% 0,100% 100%,0 100%); }     to { clip-path: polygon(0 0,52% 0,30% 100%,0 100%); } }
.leave-login    { animation: loginToCover    .5s cubic-bezier(.65,.05,.25,1) forwards; }
.leave-register { animation: registerToCover .5s cubic-bezier(.65,.05,.25,1) forwards; }
.enter-login    { animation: coverToLogin    .6s cubic-bezier(.65,.05,.25,1) forwards; }
.enter-register { animation: coverToRegister .6s cubic-bezier(.65,.05,.25,1) forwards; }

@keyframes floaty { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-14px) scale(1.06); } }
.bubble { animation: floaty 6s ease-in-out infinite; }

/* ── Phone: slanted grey header that drops over the whole card, then lifts back ── */
.mpanel { clip-path: polygon(0 0, 100% 0, 100% 104px, 0 124px); }
@keyframes mobToCover   { from { clip-path: polygon(0 0,100% 0,100% 104px,0 124px); } to { clip-path: polygon(0 0,100% 0,100% 100%,0 100%); } }
@keyframes mobFromCover { from { clip-path: polygon(0 0,100% 0,100% 100%,0 100%); } to { clip-path: polygon(0 0,100% 0,100% 104px,0 124px); } }
.mleave { animation: mobToCover   .5s cubic-bezier(.65,.05,.25,1) forwards; }
.menter { animation: mobFromCover .6s cubic-bezier(.65,.05,.25,1) forwards; }

/* ── Phone: logo bounces in, fields rise one after another ── */
@keyframes logoPop {
  0%   { opacity: 0; transform: scale(.6) translateY(-8px); }
  60%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
.logo-pop { animation: logoPop .6s cubic-bezier(.34,1.56,.64,1) both; animation-delay: var(--stagger-base, 100ms); }

@keyframes riseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 767px) {
  .stagger > * {
    animation: riseIn .45s ease-out both;
    animation-delay: calc(var(--stagger-base, 100ms) + var(--i, 0) * 60ms);
  }
  .stagger > *:nth-child(1) { --i: 0; } .stagger > *:nth-child(2) { --i: 1; }
  .stagger > *:nth-child(3) { --i: 2; } .stagger > *:nth-child(4) { --i: 3; }
  .stagger > *:nth-child(5) { --i: 4; } .stagger > *:nth-child(6) { --i: 5; }
  .stagger > *:nth-child(7) { --i: 6; } .stagger > *:nth-child(8) { --i: 7; }
}

/* ── Wrong password / validation error: quick shake ── */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); } 40% { transform: translateX(7px); }
  60% { transform: translateX(-5px); } 80% { transform: translateX(3px); }
}
.shake { animation: shake .45s ease-in-out; }

@media (prefers-reduced-motion: reduce) {
  .leave-login, .leave-register, .enter-login, .enter-register,
  .mleave, .menter { animation-duration: .01s; }
  .bubble, .logo-pop, .shake { animation: none; }
  .stagger > * { animation: none !important; }
  .fade-slide { transition-duration: .01s !important; transition-delay: 0s !important; }
}
`;

const canAnimate = () =>
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animated card for this page (kept in this file, no shared component).
 * Call go('/register') or go('/login') to sweep the panel, then open the other page.
 */
function Shell({ mode, shakeKey = 0, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = mode === 'login';

  const entering = !!location.state?.sweep && canAnimate();
  const [visible, setVisible] = useState(!entering);
  const [leaving, setLeaving] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (!shakeKey || !canAnimate()) return undefined;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 500);
    return () => clearTimeout(t);
  }, [shakeKey]);

  useEffect(() => {
    if (!entering) return undefined;
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [entering]);

  const go = (path) => {
    if (leaving) return;
    if (!canAnimate()) {
      navigate(path);
      return;
    }
    setLeaving(true);
    setVisible(false);
    setTimeout(() => navigate(path, { state: { sweep: true } }), 500);
  };

  const panelClass = leaving
    ? isLogin ? 'leave-login' : 'leave-register'
    : entering
      ? isLogin ? 'enter-login' : 'enter-register'
      : isLogin ? 'panel-login' : 'panel-register';

  const mobilePanelClass = leaving ? 'mleave' : entering ? 'menter' : 'mpanel';

  // content fades/blurs in AFTER the panel has finished moving
  const show = (side) =>
    `fade-slide transition-all duration-500 ease-out ${
      visible
        ? `opacity-100 blur-0 translate-x-0 ${entering ? 'delay-[350ms]' : ''}`
        : `opacity-0 blur-sm pointer-events-none ${side === 'left' ? '-translate-x-8' : 'translate-x-8'}`
    }`;

  const side = isLogin ? 'right' : 'left'; // the side the grey panel lives on
  const sideClass = isLogin ? 'right-0' : 'left-0'; // full literals so Tailwind can see them

  return (
    <div
      className="auth-root fixed inset-0 flex justify-center overflow-y-auto bg-cover bg-center p-3"
    >
      <style>{css}</style>

      <div
        className={`relative my-auto w-full max-w-[640px] overflow-hidden rounded-3xl border border-pink-300 bg-white
                    shadow-[0_0_45px_rgba(244,114,182,0.45)] md:flex md:min-h-[500px] ${isLogin ? '' : 'md:justify-end'} ${shaking ? 'shake' : ''}`}
      >
        {/* Phone: slanted grey panel (covers the whole card while switching pages) */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 md:hidden ${mobilePanelClass}`}
          aria-hidden="true"
        />

        {/* Phone header: the logo bounces in on top of the grey panel */}
        <div
          className="relative z-10 flex h-[104px] items-center justify-center px-4 md:hidden"
          style={{ '--stagger-base': entering ? '350ms' : '100ms' }}
        >
          <img
            src="/logo3.png"
            alt="AMIR BabyShop Logo"
            className="logo-pop h-auto max-h-[56px] w-auto max-w-[150px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
          />
        </div>

        {/* Diagonal grey panel */}
        <div
          className={`absolute inset-0 hidden bg-gradient-to-br from-gray-100 to-gray-200 md:block ${panelClass}`}
          aria-hidden="true"
        >
          <span className="bubble absolute left-[8%] top-[12%] h-20 w-20 rounded-full bg-white/70" />
          <span className="bubble absolute left-[30%] top-[62%] h-12 w-12 rounded-full bg-white/80" style={{ animationDelay: '1.2s' }} />
          <span className="bubble absolute right-[10%] top-[18%] h-14 w-14 rounded-full bg-white/70" style={{ animationDelay: '2.4s' }} />
          <span className="bubble absolute bottom-[14%] right-[22%] h-24 w-24 rounded-full bg-white/60" style={{ animationDelay: '0.6s' }} />
          <Star size={16} className="bubble absolute left-[44%] top-[10%] text-pink-300" style={{ animationDelay: '1.8s' }} />
          <Heart size={14} className="bubble absolute bottom-[10%] right-[40%] text-pink-300" style={{ animationDelay: '3s' }} />
        </div>

        {/* Logo on the grey side */}
        <div className={`pointer-events-none absolute top-0 hidden w-[42%] justify-center pt-8 md:flex ${sideClass}`}>
          <div className={show(side)}>
            <img
              src="/logo3.png"
              alt="AMIR BabyShop Logo"
              className="h-auto w-full max-w-[130px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
            />
          </div>
        </div>

        {/* Welcome text on the grey side */}
        <div className={`pointer-events-none absolute inset-y-0 hidden w-[42%] items-center justify-center p-6 md:flex ${sideClass}`}>
          <div className={`text-gray-800 ${isLogin ? 'text-right' : ''} ${show(side)}`}>
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-pink-500 ${isLogin ? 'ml-auto' : ''}`}>
              {isLogin ? <Heart size={18} /> : <Baby size={18} />}
            </div>
            <h2 className="text-2xl font-black leading-tight">{isLogin ? 'Welcome back!' : 'Welcome!'}</h2>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-gray-500">
              {isLogin
                ? 'Sign in to pick up your orders and favourites where you left them.'
                : 'Join AMIR BabyShop and find everything little ones need, from first outfits to bedtime.'}
            </p>
          </div>
        </div>

        {/* Form column (in normal flow, so the card grows with taller forms like Register step 3) */}
        <div
          className={`relative z-10 flex w-full flex-col justify-center p-6 md:w-[46%] ${show(isLogin ? 'left' : 'right')}`}
          style={{ '--stagger-base': entering ? '350ms' : '100ms' }}
        >
          {typeof children === 'function' ? children({ go }) : children}
          <p className="mt-4 text-center text-[10px] text-gray-400">
            &copy; {new Date().getFullYear()} AMIR BabyShop. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}


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
  const [shakeKey, setShakeKey] = useState(0);

  // shake the card each time a new error appears
  useEffect(() => {
    if (error) setShakeKey((k) => k + 1);
  }, [error]);

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
        claimedCount: res.claimedCount ?? 0,
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
    const claimedCount = success.claimedCount ?? 0;

    return (
      <Shell mode="register">
        {({ go }) => (
          <div className="text-center">
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

            {claimedCount > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5 text-left">
                <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="shrink-0" />
                  We found {claimedCount} past order{claimedCount !== 1 ? 's' : ''}!
                </p>
                <p className="text-[11px] text-emerald-700">
                  {claimedCount === 1
                    ? 'Your previous order is now linked to this account. View it in "My Orders" after signing in.'
                    : `Your ${claimedCount} previous orders are now linked to this account. View them in "My Orders" after signing in.`}
                </p>
              </div>
            )}

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
              onClick={() => go('/login')}
              className="btn-primary w-full py-3"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </Shell>
    );
  }

  /* ═══════════════════════════════════════════
     FORM
     ═══════════════════════════════════════════ */
  return (
    <Shell mode="register" shakeKey={shakeKey}>
      {({ go }) => (
        <>
          <button
            type="button"
            onClick={() => go('/login')}
            className="mb-2 inline-flex items-center gap-1 self-start text-xs font-bold text-gray-500 transition-colors hover:text-pink-600"
          >
            <ChevronLeft size={16} /> Back to sign in
          </button>

          <h1 className="mb-3 text-xl font-black text-gray-800">Create account</h1>

          {/* STEP PROGRESS */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
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

          <h2 className="mb-2 text-center text-xs font-bold text-gray-500">
            Step {currentStep} of 3: {steps[currentStep - 1].label}
          </h2>

          <form onSubmit={handleSubmit} className="stagger space-y-3">

            {/* ═══════ STEP 1: PERSONAL INFO ═══════ */}
            {currentStep === 1 && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/70 hover:bg-white focus:bg-white`}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/70 hover:bg-white focus:bg-white`}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/70 hover:bg-white focus:bg-white`}
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={`w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/70 hover:bg-white focus:bg-white`}
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      className={`w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm font-medium ${colorMap.ring} focus:border-transparent bg-gray-50/70 hover:bg-white focus:bg-white`}
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
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Account Type *</label>
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

          {/* Sign-in link: sweeps the panel, then opens /login */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Already have an account?{' '}
              <Link
                to="/login"
                onClick={(e) => { e.preventDefault(); go('/login'); }}
                className="text-pink-600 hover:text-pink-700 font-bold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </>
      )}
    </Shell>
  );
}