import { Link } from 'react-router-dom';
import { Gift, Check, Trash2, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

/* ═══════════════════════════════════════════════════════════
   REGISTRY ITEM CARD
   ─────────────────────────────────────────────────────────
   Two modes:
     - owner view  → can edit priority, remove
     - guest view  → can mark as gifted (opens giver modal)
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_META = {
  high:   { label: 'Really want',  cls: 'bg-rose-100 text-rose-700',    dot: 'bg-rose-500' },
  medium: { label: 'Would love',   cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  low:    { label: 'Nice to have', cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
};

export default function RegistryItemCard({
  item,
  gift,                 // the gift object if this item has been gifted, or null
  mode = 'guest',       // 'guest' | 'owner'
  onMarkGifted,         // (item) => void    (guest mode)
  onRemove,             // (item) => void    (owner mode)
  onChangePriority,     // (item, priority) => void  (owner mode)
}) {
  const priority = PRIORITY_META[item.priority] || PRIORITY_META.medium;
  const isGifted = !!gift;

  return (
    <div className={`card overflow-hidden flex flex-col ${isGifted ? 'opacity-80' : ''}`}>
      <Link
        to={`/product/${item.productId}`}
        className="block aspect-square overflow-hidden bg-amir-cream relative"
      >
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {isGifted && (
          <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-black inline-flex items-center gap-1 shadow-lg">
              <Check size={12} /> Gifted
            </span>
          </div>
        )}
        {!isGifted && (
          <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${priority.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>
        )}
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link to={`/product/${item.productId}`} className="min-w-0">
          <h3 className="font-bold text-xs sm:text-sm leading-tight line-clamp-2 hover:text-amir-pink">
            {item.name}
          </h3>
        </Link>

        <p className="font-black text-sm sm:text-base mt-1 text-amir-dark">
          {formatCurrency(item.price)}
        </p>

        {item.note && mode === 'owner' && (
          <p className="text-[10px] text-amir-dark/60 font-semibold mt-1 line-clamp-2 italic">
            "{item.note}"
          </p>
        )}

        {isGifted && gift && (
          <div className="mt-2 pt-2 border-t border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Gifted by
            </p>
            <p className="text-xs font-bold text-amir-dark truncate">{gift.giverName}</p>
            {gift.message && (
              <p className="text-[10px] text-amir-dark/60 mt-0.5 line-clamp-2 italic">
                "{gift.message}"
              </p>
            )}
          </div>
        )}

        <div className="mt-auto pt-2">
          {mode === 'guest' && !isGifted && onMarkGifted && (
            <button
              onClick={() => onMarkGifted(item)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-xs transition-all active:scale-95"
            >
              <Gift size={13} /> I'll get this
            </button>
          )}

          {mode === 'owner' && (
            <div className="flex items-center gap-1">
              <select
                value={item.priority}
                onChange={(e) => onChangePriority?.(item, e.target.value)}
                className="flex-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-gray-200 focus:border-amir-pink outline-none bg-white"
              >
                <option value="high">Really want</option>
                <option value="medium">Would love</option>
                <option value="low">Nice to have</option>
              </select>
              <Link
                to={`/product/${item.productId}`}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:border-amir-pink flex items-center justify-center text-amir-dark/60 transition-colors shrink-0"
                title="View product"
              >
                <ExternalLink size={12} />
              </Link>
              <button
                onClick={() => onRemove?.(item)}
                className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}