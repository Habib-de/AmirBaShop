import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, calcDiscounted } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import LiveRating from '../UI/LiveRating';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const [justAdded, setJustAdded] = useState(false);

  const discount = calcDiscounted(product.price, product.originalPrice);
  const lowStock = product.stock > 0 && product.stock <= 10;
  const outOfStock = product.stock === 0;

  const saved = isInWishlist(product.id);

  const badgeStyle = {
    'Best Seller': 'bg-amber-400 text-amber-900',
    'New':         'bg-amir-mint text-emerald-900',
    'Sale':        'bg-rose-400 text-white',
  };

  const handleAdd = () => {
    addItem(product);
    toast.success(`${product.name} added`, { icon: '🛒' });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    const added = toggleItem(product);
    if (added) {
      toast.success(`${product.name} saved`, { icon: '💖' });
    } else {
      toast.success(`${product.name} removed`, { icon: '💔' });
    }
  };

  return (
    <div className="card group flex flex-col animate-fade-in">
      <Link
        to={`/product/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-amir-cream"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-1">
          {product.badge && (
            <span className={`badge text-[9px] sm:text-xs px-1.5 sm:px-2.5 ${badgeStyle[product.badge] || 'bg-amir-pink text-amir-dark'}`}>
              {product.badge}
            </span>
          )}
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
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-7 h-7 sm:w-9 sm:h-9 rounded-full backdrop-blur flex items-center justify-center transition-all active:scale-90 shadow-sm ${
            saved
              ? 'bg-rose-500 text-white'
              : 'bg-white/90 text-gray-700 hover:text-rose-500 hover:bg-white'
          }`}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={13}
            className={`sm:hidden ${saved ? 'fill-white' : ''}`}
          />
          <Heart
            size={16}
            className={`hidden sm:block ${saved ? 'fill-white' : ''}`}
          />
        </button>
      </Link>

      {/* Content */}
      <div className="p-2 sm:p-4 flex flex-col flex-1">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-bold text-[13px] sm:text-base leading-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] hover:text-amir-dark/70">
            {product.name}
          </h3>

          {/* ⭐ Live rating */}
          <div className="mt-1">
            <LiveRating product={product} size={11} />
          </div>
        </Link>

        {/* Price row */}
        <div className="mt-0.5 sm:mt-2 flex items-end justify-between gap-1.5">
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-extrabold text-sm sm:text-lg text-amir-dark truncate">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[10px] sm:text-xs text-gray-400 line-through mt-0.5">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className={`btn-icon w-8 h-8 sm:w-11 sm:h-11 shadow-sm active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors ${
              justAdded
                ? 'bg-emerald-400 text-white'
                : 'bg-amir-pink hover:bg-pink-400 text-amir-dark'
            }`}
            aria-label="Add to cart"
          >
            {justAdded ? (
              <>
                <Check size={14} className="sm:hidden" strokeWidth={3} />
                <Check size={18} className="hidden sm:block" strokeWidth={3} />
              </>
            ) : (
              <>
                <Plus size={14} className="sm:hidden" strokeWidth={3} />
                <Plus size={18} className="hidden sm:block" strokeWidth={3} />
              </>
            )}
          </button>
        </div>

        {lowStock && (
          <p className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] font-bold text-rose-500">
            Only {product.stock} left!
          </p>
        )}
      </div>
    </div>
  );
}