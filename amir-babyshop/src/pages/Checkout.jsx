import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, CreditCard, Truck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useExtras } from '../context/ExtrasContext';
import { formatCurrency } from '../utils/format';
import CouponInput from '../components/UI/CouponInput';
import { orderService } from '../services/api';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { appliedCoupon, couponDiscount, removeCoupon } = useExtras();

  const [step, setStep] = useState('form');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({
    name:    user?.name  || '',
    email:   user?.email || '',
    phone:   '',
    address: '',
    city:    '',
    zip:     '',
    payment: 'card',
  });

  /* 🎯 No shipping, no tax — customer pays subtotal minus discount */
  const subtotalRounded = Math.round(subtotal);
  const total = Math.max(0, subtotalRounded - couponDiscount);
  const giftItem = items.find(i => i.giftId);           

  const errors = useMemo(() => {
    const errs = {};
    if (!form.name.trim())         errs.name = 'Full name is required';
    else if (form.name.trim().length < 2) errs.name = 'Name is too short';

    if (!form.email.trim())        errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';

    if (!form.phone.trim())        errs.phone = 'Phone is required';
    else if (!/^[+\d][\d\s\-()]{7,}$/.test(form.phone.replace(/\s/g, '')))
      errs.phone = 'Enter a valid phone number';

    if (!form.address.trim())      errs.address = 'Street address is required';
    else if (form.address.trim().length < 5) errs.address = 'Address is too short';

    if (!form.city.trim())         errs.city = 'City is required';
    if (!form.zip.trim())          errs.zip = 'ZIP / Postal code is required';
    else if (!/^[A-Za-z0-9\s\-]{3,10}$/.test(form.zip.trim()))
      errs.zip = 'Enter a valid ZIP / Postal code';

    return errs;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const showError = (field) => touched[field] && errors[field];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({
      name: true, email: true, phone: true,
      address: true, city: true, zip: true,
    });

    if (!isValid) {
      toast.error('Please fix the highlighted fields', { icon: '⚠️' });
      const firstError = Object.keys(errors)[0];
      const el = document.querySelector(`[name="${firstError}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
      return;
    }

    setStep('processing');

    try {
      /* ─── Build the payload the backend expects ─── */
      const payload = {
        items: items.map(i => ({
          productId: i.id,
          qty: i.qty,
          size: i.size || null,
          color: i.color || null,
          price: i.price,        // echo what customer saw — backend verifies
        })),
        customerName:  form.name.trim(),
        customerEmail: form.email.trim().toLowerCase(),
        customerPhone: form.phone.trim(),
        addressStreet: form.address.trim(),
        addressCity:   form.city.trim(),
        addressZip:    form.zip.trim(),
        paymentMethod: form.payment,
        couponCode:    appliedCoupon?.code || null,
        giftId:        giftItem?.giftId || null,
        notes:         null,
      };

      const order = await orderService.create(payload);

      /* ─── Clear cart & coupon after success ─── */
      clearCart();
      removeCoupon();

      setPlacedOrder(order);
      setStep('done');
      toast.success('Order placed successfully!', { icon: '🎉' });
    } catch (err) {
      setStep('form');
      const msg = err?.message || 'Could not place order. Please try again.';
      setError(msg);
      toast.error(msg, { icon: '⚠️' });
    }
  };

  /* ── SUCCESS ── */
  if (step === 'done' && placedOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black mb-1">Order placed! 🎉</h1>
        <p className="text-xs font-mono text-amir-dark/50 mb-3">{placedOrder.id}</p>
        <p className="text-sm text-amir-dark/60 font-semibold mb-5">
          Thank you! Our team will confirm your order shortly.
          {user && ' You can track it under "My Orders".'}
        </p>

        <div className="bg-amir-yellow/40 rounded-2xl p-3 mb-5 text-left">
          <p className="text-xs font-bold text-amir-dark/80 mb-1">📌 Save your Order ID</p>
          <p className="text-[11px] text-amir-dark/60 mb-2">
            You'll need it to track your order. Screenshot this screen or write it down.
          </p>
          <p className="font-mono font-black text-sm bg-white rounded-lg px-3 py-2 text-center">
            {placedOrder.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Link to="/shop" className="btn-primary">Continue shopping</Link>
          <Link to="/track" state={{ orderId: placedOrder.id }} className="btn-secondary">
            Track this order
          </Link>
          {user && (
            <Link to="/my-orders" className="btn-secondary">
              View my orders
            </Link>
          )}
        </div>
      </div>
    );
  }

  /* ── EMPTY CART ── */
  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-black mb-4">Your cart is empty</h1>
        <Link to="/shop" className="btn-primary inline-flex">Go to shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-8">
      <Link
        to="/cart"
        className="inline-flex items-center gap-2 text-sm font-bold text-amir-dark/60 hover:text-amir-dark mb-4"
      >
        <ArrowLeft size={16} /> Back to cart
      </Link>

      <h1 className="text-2xl sm:text-3xl font-black mb-1">Checkout</h1>
      <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mb-6">
        Complete your details below
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5" noValidate>

          {/* Global error banner */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-rose-700">Could not place order</p>
                <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="card p-4 sm:p-5">
            <h2 className="font-black mb-4">Contact & shipping</h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={v => setForm({ ...form, name: v })}
                  onBlur={() => handleBlur('name')}
                  error={showError('name') ? errors.name : ''}
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>

              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={v => setForm({ ...form, email: v })}
                onBlur={() => handleBlur('email')}
                error={showError('email') ? errors.email : ''}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Field
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={v => setForm({ ...form, phone: v })}
                onBlur={() => handleBlur('phone')}
                error={showError('phone') ? errors.phone : ''}
                placeholder="+254 700 123 456"
                autoComplete="tel"
              />

              <div className="sm:col-span-2">
                <Field
                  label="Street address"
                  name="address"
                  value={form.address}
                  onChange={v => setForm({ ...form, address: v })}
                  onBlur={() => handleBlur('address')}
                  error={showError('address') ? errors.address : ''}
                  placeholder="123 Baby Lane, Apt 4"
                  autoComplete="street-address"
                />
              </div>

              <Field
                label="City"
                name="city"
                value={form.city}
                onChange={v => setForm({ ...form, city: v })}
                onBlur={() => handleBlur('city')}
                error={showError('city') ? errors.city : ''}
                placeholder="Nairobi"
                autoComplete="address-level2"
              />

              <Field
                label="ZIP / Postal code"
                name="zip"
                value={form.zip}
                onChange={v => setForm({ ...form, zip: v })}
                onBlur={() => handleBlur('zip')}
                error={showError('zip') ? errors.zip : ''}
                placeholder="00100"
                autoComplete="postal-code"
              />
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <h2 className="font-black mb-4">Payment method</h2>
            <div className="grid sm:grid-cols-3 gap-2 sm:gap-3">
              {[
                { id: 'card', label: 'Card',             icon: <CreditCard size={18} /> },
                { id: 'cod',  label: 'Cash on delivery', icon: <Truck size={18} /> },
                { id: 'momo', label: 'Mobile money',     icon: '📱' },
              ].map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setForm({ ...form, payment: p.id })}
                  className={`p-3 sm:p-4 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${
                    form.payment === p.id
                      ? 'border-amir-pink bg-amir-pink/20'
                      : 'border-gray-200 hover:border-amir-pink/50'
                  }`}
                >
                  <span className="text-amir-dark">{p.icon}</span>
                  <span className="text-xs sm:text-sm text-center">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={step === 'processing'}
            className={`w-full py-4 text-base font-black rounded-full transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
              isValid
                ? 'bg-amir-pink hover:bg-pink-400 text-amir-dark shadow-sm hover:shadow-md'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {step === 'processing' ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-amir-dark border-t-transparent animate-spin" />
                Placing order...
              </>
            ) : (
              <>Place order · {formatCurrency(total)}</>
            )}
          </button>

          {!isValid && Object.keys(touched).length > 0 && (
            <p className="text-center text-xs text-rose-500 font-semibold">
              Please fix the fields above to continue
            </p>
          )}
        </form>

        <div className="lg:col-span-1">
          <div className="card p-4 sm:p-5 lg:sticky lg:top-20">
            <h2 className="font-black mb-4">Your order</h2>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {items.map(i => (
                <div key={i.key} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-amir-cream shrink-0">
                    <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs leading-tight line-clamp-2">{i.name}</p>
                    <p className="text-[10px] text-amir-dark/50 font-semibold">
                      Qty: {i.qty}
                      {[i.size, i.color].filter(Boolean).length > 0 &&
                        ` · ${[i.size, i.color].filter(Boolean).join(' · ')}`}
                    </p>
                  </div>
                  <span className="font-bold text-xs shrink-0">
                    {formatCurrency(i.price * i.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* 🎟️ Coupon input */}
            <div className="border-t border-amir-dark/10 mt-4 pt-4">
              <CouponInput subtotal={subtotalRounded} />
            </div>

            <div className="border-t border-amir-dark/10 mt-4 pt-4 space-y-1.5 text-sm font-semibold">
              <div className="flex justify-between">
                <span className="text-amir-dark/60">Subtotal</span>
                <span>{formatCurrency(subtotalRounded)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>−{formatCurrency(couponDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-base pt-2 border-t border-amir-dark/10 mt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Reusable Field Component ───────────── */
function Field({
  label, name, type = 'text', value, onChange, onBlur, error, placeholder, autoComplete,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-bold text-amir-dark/70 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full px-4 py-2.5 rounded-xl border-2 outline-none text-sm font-semibold transition-colors ${
            error
              ? 'border-rose-400 focus:border-rose-500 bg-rose-50/50'
              : 'border-gray-200 focus:border-amir-pink bg-white'
          }`}
        />
        {error && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500">
            <AlertCircle size={16} />
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-[11px] text-rose-500 font-semibold flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
}