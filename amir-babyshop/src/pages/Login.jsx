import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Clock, Baby, Heart, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* Background photo, desktop screens only (phones get the soft pink gradient).
   File lives in your project at public/back.jpeg and is served from /back.jpeg. */
const BG_IMAGE = '/back.jpeg';

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


export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // shake the card each time a new error appears
  useEffect(() => {
    if (error) setShakeKey((k) => k + 1);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsPending(false);
    setIsLoading(true);

    try {
      const res = await login(email, password);

      if (!res.ok) {
        setError(res.error || 'Login failed');
        // Detect pending-approval message → render amber box
        setIsPending((res.error || '').toLowerCase().includes('pending'));
        return;
      }

      navigate(redirectTo || '/');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Shell mode="login" shakeKey={shakeKey}>
      {({ go }) => (
        <>
          <h1 className="mb-3 text-xl font-black text-gray-800">Sign in</h1>

          <form onSubmit={handleSubmit} className="stagger space-y-2.5">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all bg-gray-50/70 hover:bg-white focus:bg-white text-sm"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors">
                  <Lock size={15} />
                </div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all bg-gray-50/70 hover:bg-white focus:bg-white text-sm"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="text-right -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-pink-600 hover:text-pink-700 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* ─── ERROR / PENDING ─── */}
            {error && (
              isPending ? (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl">
                  <Clock size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-800">Account pending approval</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Your account is waiting to be approved by the shop owner. Once they approve it, you'll be able to sign in.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white py-2 rounded-full font-extrabold hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 text-sm"
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Guest link */}
          <div className="mt-2.5 text-center">
            <p className="text-xs text-gray-500">
              Just browsing?{' '}
              <Link to="/shop" className="text-pink-600 hover:text-pink-700 font-bold hover:underline">
                Continue as guest
              </Link>
            </p>
          </div>

          {/* Register link: sweeps the panel, then opens /register */}
          <div className="mt-1.5 text-center">
            <p className="text-xs text-gray-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                onClick={(e) => { e.preventDefault(); go('/register'); }}
                className="text-pink-600 hover:text-pink-700 font-bold hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </>
      )}
    </Shell>
  );
}