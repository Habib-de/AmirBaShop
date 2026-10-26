import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Smartphone, Clock, ArrowLeft, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOrders } from '../context/OrderContext';
import { paymentService, orderService } from '../services/api';
import { formatCurrency } from '../utils/format';

export default function PayOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { reload } = useOrders();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  const pollIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  /* ─── Load order ─── */
  useEffect(() => {
    (async () => {
      try {
        const o = await orderService.getById(orderId);
        setOrder(o);
        setPhone(o.customer?.phone || '');
        setPaid(o.paymentStatus === 'paid');
      } catch (err) {
        setError(err.message || 'Could not load order');
      } finally {
        setLoading(false);
      }
    })();
    return () => cleanupTimers();
  }, [orderId]);

  const cleanupTimers = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  /* ─── Send STK push ─── */
  const handleSendPrompt = async () => {
    setError('');
    if (!phone.trim()) { setError('Enter your M-Pesa phone number'); return; }
    setSending(true);
    try {
      const res = await paymentService.stkPush(orderId, phone);
      if (!res?.ok) {
        setError(res?.error || 'STK push failed');
        return;
      }
      toast.success('Check your phone for the M-Pesa prompt', { icon: '📱' });
      startPolling();
    } catch (err) {
      setError(err.message || 'Could not send prompt');
    } finally {
      setSending(false);
    }
  };

  /* ─── Poll for payment status ─── */
  const startPolling = () => {
    setPolling(true);
    setSecondsLeft(90);

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const s = await paymentService.getStatus(orderId);
        if (s?.paymentStatus === 'paid') {
          cleanupTimers();
          setPaid(true);
          setPolling(false);
          setOrder(prev => prev ? { ...prev, paymentStatus: 'paid', mpesaReceiptCode: s.receipt } : prev);
          toast.success('Payment received!', { icon: '✅' });
          reload();
        }
      } catch (err) {
        console.warn('poll error', err);
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

  /* ─── Copy paybill ─── */
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', { icon: '📋' });
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse text-4xl mb-3">⏳</div>
        <p className="text-sm font-bold text-amir-dark/60">Loading order…</p>
      </div>
    );
  }

  /* ─── Not found ─── */
  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">😢</div>
        <h1 className="text-xl font-black mb-3">Order not found</h1>
        <Link to="/my-orders" className="btn-secondary inline-flex">My orders</Link>
      </div>
    );
  }

  /* ─── Already paid ─── */
  if (paid) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black mb-1">Payment received! 🎉</h1>
        <p className="text-xs font-mono text-amir-dark/50 mb-3">{order.id}</p>
        {order.mpesaReceiptCode && (
          <p className="text-[11px] text-emerald-700 font-bold mb-4">
            M-Pesa Receipt: {order.mpesaReceiptCode}
          </p>
        )}
        <p className="text-sm text-amir-dark/60 font-semibold mb-5">
          We'll confirm your order shortly.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link to="/my-orders" className="btn-primary">View my orders</Link>
          <Link to="/shop" className="btn-secondary">Continue shopping</Link>
        </div>
      </div>
    );
  }

  /* ─── Already cancelled ─── */
  if (order.status === 'cancelled') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-3">❌</div>
        <h1 className="text-xl font-black mb-3">Order cancelled</h1>
        <Link to="/shop" className="btn-secondary inline-flex">Continue shopping</Link>
      </div>
    );
  }

  /* ─── Already set for manual paybill ─── */
  const isManualPaybill = order.paymentFlow === 'manual_paybill';
  const isStkPush       = order.paymentFlow === 'stk_push';
  const isCod           = order.paymentFlow === 'cod';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-8">

      <Link to="/my-orders" className="inline-flex items-center gap-2 text-sm font-bold text-amir-dark/60 hover:text-amir-dark mb-4">
        <ArrowLeft size={16} /> Back to orders
      </Link>

      {/* ─── Order summary card ─── */}
      <div className="card p-4 sm:p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50">Order</p>
            <p className="font-black text-sm font-mono">{order.id}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50">Total</p>
            <p className="font-black text-lg">{formatCurrency(order.total)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs font-semibold text-amir-dark/60">
          <span>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
          <span className="badge bg-amber-100 text-amber-800">Unpaid</span>
        </div>
      </div>

      {/* ─── STK Push flow ─── */}
      {isStkPush && !polling && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-black text-base">Pay with M-Pesa</p>
              <p className="text-[11px] text-amir-dark/60 font-semibold">We'll send a prompt to your phone</p>
            </div>
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
            M-Pesa phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+254 700 123 456"
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
            onClick={handleSendPrompt}
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

          <p className="text-[11px] text-amir-dark/50 text-center mt-3">
            You'll get a popup on your phone. Enter your M-Pesa PIN to complete.
          </p>
        </div>
      )}

      {/* ─── Polling state ─── */}
      {isStkPush && polling && (
        <div className="card p-6 text-center">
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
            Don't close this page
          </p>
        </div>
      )}

      {/* ─── Manual paybill ─── */}
      {isManualPaybill && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              💳
            </span>
            <div className="min-w-0">
              <p className="font-black text-base">Pay via M-Pesa Paybill</p>
              <p className="text-[11px] text-amir-dark/60 font-semibold">Manual payment</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-3">
            <CopyRow label="Paybill Number" value="247247" onCopy={copy} />
            <CopyRow label="Account Number" value={order.id} onCopy={copy} />
            <CopyRow label="Amount" value={formatCurrency(order.total)} onCopy={copy} />
          </div>

          <p className="text-[11px] text-amir-dark/60 text-center font-semibold">
            After paying, please contact us to confirm your order.
          </p>
        </div>
      )}

      {/* ─── COD ─── */}
      {isCod && (
        <div className="card p-5 text-center">
          <div className="text-4xl mb-3">💰</div>
          <p className="font-black text-base mb-1">Cash on Delivery</p>
          <p className="text-xs text-amir-dark/60 font-semibold">
            Pay {formatCurrency(order.total)} when your order arrives.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Copy row helper ─── */
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