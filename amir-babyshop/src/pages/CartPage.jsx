import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useExtras } from '../context/ExtrasContext';
import { formatCurrency } from '../utils/format';
import CouponInput from '../components/UI/CouponInput';

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, clearCart } = useCart();
  const { couponDiscount } = useExtras();

  const subtotalRounded = Math.round(subtotal);

  // 🎯 No shipping, no tax — customer pays subtotal minus any discount
  const total = Math.max(0, subtotalRounded - couponDiscount);

  const handleClear = () => {
    if (confirm('Clear your entire cart?')) {
      clearCart();
      toast.success('Cart cleared', { icon: '🧺' });
    }
  };

  const handleRemove = (item) => {
    removeItem(item.key);
    toast.success(`${item.name} removed`, { icon: '🗑️' });
  };

  const handleQty = (item, newQty) => {
    if (newQty <= 0) {
      removeItem(item.key);
      toast.success(`${item.name} removed`, { icon: '🗑️' });
    } else {
      updateQty(item.key, newQty);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-black mb-2">Your cart is empty</h1>
        <p className="text-sm text-amir-dark/60 font-semibold mb-6">
          Add some adorable things for your little one
        </p>
        <Link to="/shop" className="btn-primary inline-flex">
          Start Shopping <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Your cart</h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
            {items.length} item{items.length !== 1 && 's'}
          </p>
        </div>
        <button
          onClick={handleClear}
          className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider"
        >
          Clear all
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div key={item.key} className="card p-3 flex gap-3">
              <Link
                to={`/product/${item.id}`}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-amir-cream shrink-0"
              >
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/product/${item.id}`} className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-amir-dark/50 font-semibold mt-0.5">
                      {[item.size, item.color].filter(Boolean).join(' • ')}
                    </p>
                  </Link>
                  <button
                    onClick={() => handleRemove(item)}
                    className="btn-icon w-8 h-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-1 bg-amir-cream rounded-full p-0.5">
                    <button
                      onClick={() => handleQty(item, item.qty - 1)}
                      className="btn-icon w-8 h-8 hover:bg-white"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-black text-sm">{item.qty}</span>
                    <button
                      onClick={() => handleQty(item, item.qty + 1)}
                      className="btn-icon w-8 h-8 hover:bg-white"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-black text-base sm:text-lg">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="card p-5 lg:sticky lg:top-20">
            <h2 className="font-black text-lg mb-4">Order summary</h2>

            {/* 🎟️ Coupon input */}
            <div className="mb-4">
              <CouponInput subtotal={subtotalRounded} />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between font-semibold">
                <span className="text-amir-dark/60">Subtotal</span>
                <span>{formatCurrency(subtotalRounded)}</span>
              </div>

              {/* 🎟️ Discount line (only when applied) */}
              {couponDiscount > 0 && (
                <div className="flex justify-between font-semibold text-emerald-600">
                  <span>Discount</span>
                  <span>−{formatCurrency(couponDiscount)}</span>
                </div>
              )}

              <div className="border-t border-amir-dark/10 pt-3 mt-3 flex justify-between font-black text-base">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Link to="/checkout" className="btn-primary w-full mt-5 py-4">
              <ShoppingBag size={18} /> Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}