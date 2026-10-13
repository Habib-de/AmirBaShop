import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Demo: check that the email exists in our local users
    const emailLower = email.trim().toLowerCase();
    const known = ['owner@amir.com', 'sales@amir.com', 'customer@amir.com'];

    if (!known.includes(emailLower)) {
      setError("We couldn't find an account with that email.");
      return;
    }

    setSent(true);
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-3 overflow-hidden fixed inset-0">
      <div className="w-full max-w-sm">
        <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-4 text-center border-b border-gray-300">
            <div className="flex justify-center">
              <img
                src="/logo3.png"
                alt="AMIR BabyShop Logo"
                className="w-full max-w-[140px] h-auto object-contain mx-auto"
              />
            </div>
          </div>

          <div className="p-4">
            {sent ? (
              // Success state
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <h2 className="text-base font-bold text-gray-800 mb-1">Check your inbox</h2>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  We've sent password reset instructions to <strong>{email}</strong>
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs text-pink-600 hover:text-pink-700 font-bold hover:underline"
                >
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </div>
            ) : (
              // Form state
              <>
                <div className="text-center mb-3">
                  <h2 className="text-sm font-semibold text-gray-800">Forgot password?</h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Enter your email and we'll send you a reset link
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2.5">
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
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-pink-400 to-pink-500 text-amir-dark py-2.5 rounded-lg font-semibold hover:from-pink-500 hover:to-pink-600 transition-all duration-300 shadow-md shadow-pink-500/20 text-sm"
                  >
                    Send reset link
                  </button>
                </form>

                <div className="mt-3 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-pink-600 font-medium"
                  >
                    <ArrowLeft size={13} /> Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>

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