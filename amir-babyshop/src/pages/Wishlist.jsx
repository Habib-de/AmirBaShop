import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, calcDiscounted } from '../utils/format';

export default function Wishlist() {
  const { items, removeItem, clearWishlist } = useWishlist();
  const { addItem } = useCart();
  const { user } = useAuth();

  /* ─── Move single item to cart ─── */
  const handleMoveToCart = (product) => {
    addItem(product, 1);
    removeItem(product.id);
    toast.success(`${product.name} moved to cart`, { icon: '🛒' });
  };

  /* ─── Move ALL items to cart ─── */
  const handleMoveAll = () => {
    if (items.length === 0) return;
    items.forEach(p => addItem(p, 1));
    clearWishlist();
    toast.success(`${items.length} item${items.length !== 1 ? 's' : ''} moved to cart`, {
      icon: '🛒',
    });
  };

  /* ─── Remove single item ─── */
  const handleRemove = (product) => {
    removeItem(product.id);
    toast.success(`${product.name} removed`, { icon: '💔' });
  };

  /* ─── Clear all ─── */
  const handleClear = () => {
    if (confirm('Clear your entire wishlist?')) {
      clearWishlist();
      toast.success('Wishlist cleared', { icon: '🧹' });
    }
  };

  /* ─── EMPTY STATE ─── */
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">💖</div>
        <h1 className="text-2xl font-black mb-2">Your wishlist is empty</h1>
        <p className="text-sm text-amir-dark/60 font-semibold mb-6">
          Tap the heart on any product to save it for later
        </p>
        <Link to="/shop" className="btn-primary inline-flex">
          Browse products <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Heart size={24} className="text-rose-500 fill-rose-500" />
            Wishlist
          </h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
            {items.length} saved item{items.length !== 1 && 's'}
            {user && ` · ${user.name.split(' ')[0]}'s saved items`}
          </p>
        </div>

        <button
          onClick={handleClear}
          className="shrink-0 text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider"
        >
          Clear all
        </button>
      </div>

      {/* Bulk action bar */}
      <div className="card p-3 sm:p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-amir-pink/30 flex items-center justify-center shrink-0">
            <Package size={16} className="text-amir-dark" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-black leading-tight">
              {items.length} item{items.length !== 1 && 's'} ready
            </p>
            <p className="text-[10px] sm:text-xs text-amir-dark/60 font-semibold truncate">
              Move them all to your cart in one tap
            </p>
          </div>
        </div>

        <button
          onClick={handleMoveAll}
          className="btn-primary text-sm py-2.5 px-4 shrink-0"
        >
          <ShoppingBag size={16} />
          Add all to cart
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {items.map(product => (
          <WishlistCard
            key={product.id}
            product={product}
            onMoveToCart={() => handleMoveToCart(product)}
            onRemove={() => handleRemove(product)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Individual Wishlist Card ─── */
function WishlistCard({ product, onMoveToCart, onRemove }) {
  const discount = calcDiscounted(product.price, product.originalPrice);
  const outOfStock = product.stock === 0;
  const lowStock = product.stock > 0 && product.stock <= 10;

  return (
    <div className="card group flex flex-col animate-fade-in">

      {/* Image + Remove */}
      <div className="relative">
        <Link
          to={`/product/${product.id}`}
          className="block aspect-square overflow-hidden bg-amir-cream"
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge bg-rose-500 text-white text-[9px] sm:text-xs px-1.5 sm:px-2.5">
              -{discount}%
            </span>
          )}
          {outOfStock && (
            <span className="badge bg-gray-800 text-white text-[9px] sm:text-xs px-1.5 sm:px-2.5">
              Sold Out
            </span>
          )}
          {!outOfStock && lowStock && (
            <span className="badge bg-amber-400 text-amber-900 text-[9px] sm:text-xs px-1.5 sm:px-2.5">
              Only {product.stock} left
            </span>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
          aria-label={`Remove ${product.name} from wishlist`}
          title="Remove from wishlist"
        >
          <Trash2 size={13} className="sm:hidden" />
          <Trash2 size={15} className="hidden sm:block" />
        </button>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-4 flex flex-col flex-1">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-bold text-[13px] sm:text-base leading-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] hover:text-amir-dark/70">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mt-0.5 sm:mt-2 flex items-end gap-1.5">
          <span className="font-extrabold text-sm sm:text-lg text-amir-dark truncate">
            {formatCurrency(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-[10px] sm:text-xs text-gray-400 line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-2 sm:mt-3 flex flex-col gap-1.5">
          <button
            onClick={onMoveToCart}
            disabled={outOfStock}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-[11px] sm:text-xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={12} />
            {outOfStock ? 'Sold out' : 'Move to cart'}
          </button>
        </div>
      </div>
    </div>
  );
}