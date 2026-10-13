import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Heart, Clock, Ruler, Share2, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useInventory,
  getVariantStock,
  getTotalStock,
  isVariantInStock,
} from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useExtras } from '../context/ExtrasContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { formatCurrency, calcDiscounted } from '../utils/format';
import LiveRating from '../components/UI/LiveRating';
import ReviewSection from '../components/Reviews/ReviewSection';
import RelatedProducts from '../components/Products/RelatedProducts';
import ProductGrid from '../components/Products/ProductGrid';
import SizeGuideModal from '../components/UI/SizeGuideModal';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products } = useInventory();
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { items: recentItems, record } = useRecentlyViewed();
  const { subscribeToStock } = useExtras();
  const product = products.find(p => p.id === Number(id));

  const [qty, setQty] = useState(1);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [added, setAdded] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  /* 🔔 Back-in-stock notify state */
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySent, setNotifySent] = useState(false);

  /* 🕒 Record this view */
  useEffect(() => {
    if (product) record(product);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 🎯 Initialize size/color to first IN-STOCK variant */
  useEffect(() => {
    if (!product) return;

    const sizes = product.sizes || [];
    const colors = product.colors || [];

    let firstAvailableSize = null;
    let firstAvailableColor = null;

    for (const s of sizes) {
      for (const c of colors) {
        if (getVariantStock(product, s, c) > 0) {
          firstAvailableSize = s;
          firstAvailableColor = c;
          break;
        }
      }
      if (firstAvailableSize) break;
    }

    setSize(firstAvailableSize ?? sizes[0] ?? null);
    setColor(firstAvailableColor ?? colors[0] ?? null);

    // Reset notify form when product changes
    setShowNotifyForm(false);
    setNotifySent(false);
    setNotifyEmail('');
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">😢</div>
        <h1 className="text-2xl font-black mb-2">Product not found</h1>
        <Link to="/shop" className="btn-primary mt-4 inline-flex">Back to shop</Link>
      </div>
    );
  }

  const totalStock = getTotalStock(product);
  const outOfStock = totalStock === 0;
  const discount = calcDiscounted(product.price, product.originalPrice);
  const saved = isInWishlist(product.id);

  const currentVariantStock = getVariantStock(product, size, color);
  const isCurrentVariantSoldOut = currentVariantStock === 0;

  const isSizeAvailable = (s) => {
    if (!product.variants) return true;
    const colors = product.colors?.length ? product.colors : ['_'];
    return colors.some(c => getVariantStock(product, s, c) > 0);
  };

  const isColorAvailable = (c) => {
    if (!product.variants) return true;
    const sizes = product.sizes?.length ? product.sizes : ['_'];
    return sizes.some(s => getVariantStock(product, s, c) > 0);
  };

  const recentToShow = recentItems.filter(p => p.id !== product.id).slice(0, 4);

  const handleAdd = () => {
    if (outOfStock) return;
    if (currentVariantStock === 0) {
      toast.error('This size/color is sold out', { icon: '😔' });
      return;
    }
    if (qty > currentVariantStock) {
      toast.error(`Only ${currentVariantStock} left in this variant`, { icon: '⚠️' });
      return;
    }
    addItem(product, qty, { size, color });
    setAdded(true);
    toast.success(`${product.name} added to cart`, { icon: '🛒' });
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWishlist = () => {
    const added = toggleItem(product);
    if (added) {
      toast.success(`${product.name} saved to wishlist`, { icon: '💖' });
    } else {
      toast.success(`${product.name} removed from wishlist`, { icon: '💔' });
    }
  };

  /* 📤 WhatsApp share */
  const handleShare = () => {
    const productUrl = `${window.location.origin}/product/${product.id}`;
    const priceText = product.originalPrice
      ? `${formatCurrency(product.price)} (was ${formatCurrency(product.originalPrice)})`
      : formatCurrency(product.price);

    const message =
      `Check out *${product.name}* on AMIR BabyShop 🍼\n\n` +
      `💰 ${priceText}\n` +
      `👀 ${productUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp…', { icon: '📤' });
  };

  /* 🔔 Subscribe to back-in-stock alert */
  const handleSubscribe = (e) => {
    e.preventDefault();
    const clean = notifyEmail.trim().toLowerCase();

    if (!clean || !/^\S+@\S+\.\S+$/.test(clean)) {
      toast.error('Enter a valid email address');
      return;
    }

    const res = subscribeToStock({
      productId: product.id,
      productName: product.name,
      size,
      color,
      email: clean,
    });

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    setNotifySent(true);
    setNotifyEmail('');
    toast.success('We\'ll notify you when it\'s back!', { icon: '🔔' });

    // Auto-close after 4 seconds
    setTimeout(() => {
      setNotifySent(false);
      setShowNotifyForm(false);
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-28 md:pb-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-bold text-amir-dark/60 hover:text-amir-dark mb-4"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        <div className="relative aspect-square rounded-3xl overflow-hidden bg-white shadow-sm">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          {product.badge && (
            <span className="absolute top-4 left-4 badge bg-amir-pink text-amir-dark">{product.badge}</span>
          )}
          {discount > 0 && (
            <span className="absolute top-4 right-4 badge bg-rose-500 text-white">-{discount}%</span>
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-xs font-bold text-amir-dark/50 uppercase tracking-widest">
            {product.category}
          </p>

          {/* Title row + Share + Heart */}
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-black leading-tight flex-1 min-w-0">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm bg-white border-2 border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300"
                aria-label="Share on WhatsApp"
                title="Share on WhatsApp"
              >
                <Share2 size={18} />
              </button>

              <button
                onClick={handleWishlist}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm ${
                  saved
                    ? 'bg-rose-500 text-white'
                    : 'bg-white border-2 border-gray-200 text-gray-500 hover:text-rose-500 hover:border-rose-300'
                }`}
                aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
                title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={20} className={saved ? 'fill-white' : ''} />
              </button>
            </div>
          </div>

          <div className="mt-2">
            <LiveRating product={product} size={16} />
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black text-amir-dark">{formatCurrency(product.price)}</span>
            {product.originalPrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>

          <p className="mt-4 text-sm text-amir-dark/70 leading-relaxed">{product.description}</p>

          {/* SIZE */}
          {product.sizes && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-amir-dark/50">Size</p>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amir-pink hover:text-pink-500 underline"
                >
                  <Ruler size={12} /> Size guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(s => {
                  const available = isSizeAvailable(s);
                  const selected = size === s;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        if (!available) return;
                        setSize(s);
                        setShowNotifyForm(false);
                        setNotifySent(false);
                      }}
                      disabled={!available}
                      className={`relative px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                        !available
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                          : selected
                          ? 'border-amir-pink bg-amir-pink/30 text-amir-dark'
                          : 'border-gray-200 bg-white text-amir-dark hover:border-amir-pink/50'
                      }`}
                      title={!available ? 'Sold out' : undefined}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLOR */}
          {product.colors && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-amir-dark/50 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map(c => {
                  const available = isColorAvailable(c);
                  const selected = color === c;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        if (!available) return;
                        setColor(c);
                        setShowNotifyForm(false);
                        setNotifySent(false);
                      }}
                      disabled={!available}
                      className={`relative px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                        !available
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                          : selected
                          ? 'border-amir-pink bg-amir-pink/30 text-amir-dark'
                          : 'border-gray-200 bg-white text-amir-dark hover:border-amir-pink/50'
                      }`}
                      title={!available ? 'Sold out' : undefined}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock indicator */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white rounded-full border-2 border-gray-200 p-1">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="btn-icon hover:bg-amir-pink/20"
                disabled={outOfStock}
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-black">{qty}</span>
              <button
                onClick={() => setQty(Math.min(currentVariantStock || 99, qty + 1))}
                className="btn-icon hover:bg-amir-pink/20"
                disabled={outOfStock || qty >= currentVariantStock}
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-sm font-semibold text-amir-dark/60">
              {outOfStock ? (
                <span className="text-rose-500 font-bold">Out of stock</span>
              ) : currentVariantStock === 0 ? (
                <span className="text-rose-500 font-bold">This variant is sold out</span>
              ) : currentVariantStock <= 5 ? (
                <span className="text-rose-500 font-bold">Only {currentVariantStock} left in this variant</span>
              ) : (
                <span className="text-emerald-600 font-bold">In stock ({currentVariantStock} available)</span>
              )}
            </p>
          </div>

          {/* Add to cart OR Notify me */}
          {isCurrentVariantSoldOut && !outOfStock ? (
            /* 🔔 Sold out variant → show notify form */
            <div className="mt-6">
              {notifySent ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200">
                  <span className="text-2xl shrink-0">✅</span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-emerald-800">
                      You're on the list!
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      We'll notify you when {[size, color].filter(Boolean).join(' · ')} is back in stock.
                    </p>
                  </div>
                </div>
              ) : showNotifyForm ? (
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-amber-600 shrink-0" />
                    <p className="text-xs font-bold uppercase tracking-wider text-amir-dark/70">
                      Notify me when this variant is back
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      autoFocus
                      className="input flex-1 text-sm"
                      placeholder="your@email.com"
                      value={notifyEmail}
                      onChange={e => setNotifyEmail(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-full bg-amir-dark hover:bg-amir-dark/90 text-white font-bold text-xs transition-colors shrink-0"
                    >
                      Notify me
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifyForm(false)}
                    className="text-[10px] text-amir-dark/50 hover:text-amir-dark font-semibold underline"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowNotifyForm(true)}
                  className="w-full py-4 rounded-full font-bold text-base inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99] border-2 bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  <Bell size={20} />
                  Notify me when back in stock
                </button>
              )}
            </div>
          ) : (
            /* Normal add-to-cart */
            <button
              onClick={handleAdd}
              disabled={outOfStock || currentVariantStock === 0}
              className="btn-primary mt-6 w-full text-base py-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={20} />
              {added
                ? 'Added to cart ✓'
                : outOfStock
                ? 'Sold out'
                : currentVariantStock === 0
                ? 'This variant is sold out'
                : 'Add to cart'}
            </button>
          )}

          {/* Add to wishlist */}
          <button
            onClick={handleWishlist}
            className={`mt-3 w-full py-3.5 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99] border-2 ${
              saved
                ? 'bg-rose-500 border-rose-500 text-white hover:bg-rose-600'
                : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Heart size={18} className={saved ? 'fill-white' : ''} />
            {saved ? 'Saved to wishlist' : 'Add to wishlist'}
          </button>

          {/* 📤 Share on WhatsApp */}
          <button
            onClick={handleShare}
            className="mt-3 w-full py-3.5 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99] border-2 bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          >
            <Share2 size={18} />
            Share on WhatsApp
          </button>
        </div>
      </div>

      <ReviewSection product={product} />
      <RelatedProducts product={product} />

      {recentToShow.length > 0 && (
        <section className="mt-10 sm:mt-14 pt-6 sm:pt-10 border-t border-amir-dark/10">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                <Clock size={22} className="text-amir-pink" />
                Recently viewed
              </h2>
              <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
                Pick up where you left off
              </p>
            </div>
          </div>
          <ProductGrid products={recentToShow} />
        </section>
      )}

      {showSizeGuide && (
        <SizeGuideModal onClose={() => setShowSizeGuide(false)} />
      )}
    </div>
  );
}