import { useState, useEffect, useRef } from 'react';
import {
  X, Smartphone, Copy, CheckCircle2, AlertCircle,
  Clock, CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentService, orderService } from '../../services/api';
import { formatCurrency } from '../../utils/format';

/**
 * Payment modal — opens right after order creation.
 *
 * Props:
 *   order       : Order object (id, total, paymentFlow, customer.phone, ...)
 *   shopInfo    : { paybill: '247247' } — from tenant config (or hardcoded for now)
 *   onSuccess   : () => void  — close modal, show success screen
 *   onCancel    : () => void  — close modal without paying (order stays unpaid)
 */
export default function PaymentModal({ order, shopInfo = {}, onSuccess, onCancel }) {
  const [mode, setMode] = useState(order?.paymentFlow === 'stk_push' ? 'stk' : 'paybill');
  const [phone, setPhone] = useState(order?.customer?.phone || '');
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [receiptCode, setReceiptCode] = useState('');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);

  const pollIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  /* ─── Cleanup on unmount ─── */
  useEffect(() => () => cleanupTimers(), []);

  const cleanupTimers = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  /* ─── Copy helper ─── */
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', { icon: '📋' });
  };

  /* ═══════════════════════════════════════════════════
     STK PUSH
     ═══════════════════════════════════════════════════ */
  const handleSendStk = async () => {
    setError('');
    if (!phone.trim()) {
      setError('Enter your M-Pesa phone number');
      return;
    }
    setSending(true);
    try {
      const res = await paymentService.stkPush(order.id, phone);
      if (!res?.ok) {
        setError(res?.error || 'STK push failed');
        return;
      }
      toast.success('Check your phone for the M-Pesa prompt', { icon: '📱' });
      startPolling();
    } catch (err) {
      setError(err?.message || 'Could not send prompt');
    } finally {
      setSending(false);
    }
  };

  const startPolling = () => {
    setPolling(true);
    setSecondsLeft(90);

    cleanupTimers();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const s = await paymentService.getStatus(order.id);
        if (s?.paymentStatus === 'paid') {
          cleanupTimers();
          setPaid(true);
          setPolling(false);
          toast.success('Payment received!', { icon: '✅' });
        }
      } catch (err) {
        console.warn('poll error:', err);
      }
    }, 2500);

    countdownRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          cleanupTimers();
          setPolling(false);
          setError('Prompt timed out. Try again or pay via paybill.');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  /* ═══════════════════════════════════════════════════
     PAYBILL
     ═══════════════════════════════════════════════════ */
  const handleSubmitReceipt = async () => {
    if (!receiptCode.trim()) {
      setError('Enter your M-Pesa receipt code');
      return;
    }
    setSubmittingReceipt(true);
    setError('');
    try {
      // POST /orders/:id/submit-mpesa-code
      await orderService.submitMpesaCode(order.id, receiptCode.trim().toUpperCase());
      setReceiptSubmitted(true);
      toast.success('Receipt submitted. Waiting for verification.', { icon: '✅' });
    } catch (err) {
      setError(err?.message || 'Could not submit receipt');
    } finally {
      setSubmittingReceipt(false);
    }
  };

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  const paybill = shopInfo.paybill || '247247';
  const account = order.id;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={paid ? undefined : onCancel} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* ═══ PAID ═══ */}
        {paid && (
          <div className="p-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-black mb-1">Payment received! 🎉</h2>
            <p className="text-xs font-mono text-amir-dark/50 mb-4">{order.id}</p>
            <p className="text-sm text-amir-dark/60 font-semibold mb-5">
              We'll confirm your order shortly.
            </p>
            <button
              onClick={onSuccess}
              className="btn-primary w-full py-3"
            >
              Continue
            </button>
          </div>
        )}

        {/* ═══ RECEIPT SUBMITTED (paybill) ═══ */}
        {!paid && receiptSubmitted && (
          <div className="p-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Clock size={40} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-black mb-1">Receipt submitted</h2>
            <p className="text-xs font-mono text-amir-dark/50 mb-4">{order.id}</p>
            <p className="text-sm text-amir-dark/60 font-semibold mb-5">
              Our team will verify your payment and confirm the order.
              You can track it under "My Orders".
            </p>
            <button
              onClick={onSuccess}
              className="btn-primary w-full py-3"
            >
              Continue
            </button>
          </div>
        )}

        {/* ═══ ACTIVE PAYMENT UI ═══ */}
        {!paid && !receiptSubmitted && (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50">
                  Order {order.id}
                </p>
                <p className="font-black text-lg">{formatCurrency(order.total)}</p>
              </div>
              <button
                onClick={onCancel}
                className="w-9 h-9 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex border-b border-amir-dark/5">
              <button
                onClick={() => { setMode('stk'); setError(''); }}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  mode === 'stk'
                    ? 'text-amir-dark border-b-2 border-amir-pink'
                    : 'text-gray-400 hover:text-amir-dark'
                }`}
              >
                📱 STK prompt
              </button>
              <button
                onClick={() => { setMode('paybill'); setError(''); }}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  mode === 'paybill'
                    ? 'text-amir-dark border-b-2 border-amir-pink'
                    : 'text-gray-400 hover:text-amir-dark'
                }`}
              >
                💳 Paybill
              </button>
            </div>

            {/* ═══ STK MODE ═══ */}
            {mode === 'stk' && !polling && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Smartphone size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-amir-dark">Send M-Pesa prompt</p>
                    <p className="text-[11px] text-amir-dark/60 font-semibold">
                      Enter M-Pesa PIN on your phone
                    </p>
                  </div>
                </div>

                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
                  M-Pesa phone number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="254708374149"
                  disabled={sending}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold bg-white mb-3"
                />

                {error && (
                  <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg mb-3">
                    <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-rose-700 font-semibold">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSendStk}
                  disabled={sending || !phone.trim()}
                  className="w-full py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Smartphone size={16} /> Send M-Pesa prompt
                    </>
                  )}
                </button>

                <p className="text-[10px] text-amir-dark/50 text-center mt-3">
                  A prompt will appear on your phone. Enter your PIN to complete.
                </p>
              </div>
            )}

            {/* ═══ STK POLLING ═══ */}
            {mode === 'stk' && polling && (
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4 relative">
                  <span className="absolute inset-0 rounded-full bg-emerald-200 animate-ping" />
                  <Smartphone size={28} className="text-emerald-600 relative" />
                </div>
                <p className="font-black text-base mb-1">Check your phone 📱</p>
                <p className="text-xs text-amir-dark/60 font-semibold mb-4">
                  Enter your M-Pesa PIN on the prompt that just arrived
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-800 font-bold text-xs">
                  <Clock size={14} /> Waiting… {secondsLeft}s
                </div>
                <p className="text-[10px] text-amir-dark/40 font-semibold mt-4">
                  Don't close this window
                </p>
              </div>
            )}

            {/* ═══ PAYBILL MODE ═══ */}
            {mode === 'paybill' && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <CreditCard size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-amir-dark">Pay via Paybill</p>
                    <p className="text-[11px] text-amir-dark/60 font-semibold">
                      Use M-Pesa → Lipa na M-Pesa → Pay Bill
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4">
                  <CopyRow label="Paybill" value={paybill} onCopy={copy} />
                  <CopyRow label="Account" value={account} onCopy={copy} />
                  <CopyRow label="Amount" value={String(Math.round(order.total))} onCopy={copy} />
                </div>

                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
                  After paying, enter your receipt code
                </label>
                <input
                  type="text"
                  value={receiptCode}
                  onChange={e => setReceiptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SGH1ABCDEFG"
                  disabled={submittingReceipt}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-bold font-mono bg-white mb-3"
                />

                {error && (
                  <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg mb-3">
                    <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-rose-700 font-semibold">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmitReceipt}
                  disabled={submittingReceipt || !receiptCode.trim()}
                  className="w-full py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {submittingReceipt ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-amir-dark border-t-transparent animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>Submit receipt</>
                  )}
                </button>

                <button
                  onClick={onCancel}
                  className="w-full py-2 text-[11px] text-amir-dark/50 hover:text-amir-dark font-semibold mt-2"
                >
                  I'll pay later
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CopyRow({ label, value, onCopy }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-black font-mono text-amir-dark">{value}</span>
        <button
          onClick={() => onCopy(value)}
          className="w-6 h-6 rounded-full bg-white hover:bg-amir-pink/30 flex items-center justify-center text-amir-dark/60"
          aria-label="Copy"
        >
          <Copy size={11} />
        </button>
      </div>
    </div>
  );
}