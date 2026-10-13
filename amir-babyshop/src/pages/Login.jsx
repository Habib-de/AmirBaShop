import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsPending(false);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(email, password);
      if (!res.ok) {
        setError(res.error);
        // Detect pending error to render a nicer amber box
        setIsPending(res.error?.includes('pending'));
        setIsLoading(false);
        return;
      }
      navigate(redirectTo || '/');
    }, 400);
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-3 overflow-hidden fixed inset-0">
      <div className="w-full max-w-sm h-full max-h-[600px] flex items-center">
        <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Logo Header */}
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-4 text-center border-b border-gray-300">
            <div className="flex justify-center">
              <img
                src="/logo3.png"
                alt="AMIR BabyShop Logo"
                className="w-full max-w-[140px] h-auto object-contain mx-auto"
              />
            </div>
          </div>

          {/* Form Section */}
          <div className="p-4">
            <div className="text-center mb-2">
              <h2 className="text-sm font-semibold text-gray-800">Welcome Back</h2>
              <p className="text-gray-500 text-xs mt-0.5">Sign in to your AMIR BabyShop account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                    className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                    className="w-full pl-9 pr-10 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
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
                  className="text-xs text-pink-600 hover:text-pink-700 hover:underline"
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
                className="w-full bg-gradient-to-r from-pink-400 to-pink-500 text-amir-dark py-2.5 rounded-lg font-semibold hover:from-pink-500 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 text-sm"
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 text-amir-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                <Link to="/shop" className="text-pink-600 hover:text-pink-700 font-medium hover:underline">
                  Continue as guest
                </Link>
              </p>
            </div>

            {/* Register link */}
            <div className="mt-1.5 text-center">
              <p className="text-xs text-gray-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-pink-600 hover:text-pink-700 font-medium hover:underline">
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pb-2">
            <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold sm:font-normal">
              &copy; {new Date().getFullYear()} AMIR BabyShop. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}