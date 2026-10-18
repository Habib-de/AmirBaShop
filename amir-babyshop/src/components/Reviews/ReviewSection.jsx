import { useState, useMemo } from 'react';
import { Star, ChevronDown, PenLine, MessageSquare } from 'lucide-react';
import { useReviews } from '../../context/ReviewsContext';
import { useAuth } from '../../context/AuthContext';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';

export default function ReviewSection({ product }) {
  const { getByProduct, getStats, hasReviewed } = useReviews();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState('recent'); // 'recent' | 'helpful' | 'highest' | 'lowest'

  const reviews = useMemo(() => getByProduct(product.id), [product.id, getByProduct]);
  const stats = useMemo(() => getStats(product.id), [product.id, getStats]);

  const alreadyReviewed = user ? hasReviewed(product.id, user.email) : false;

  /* ─── Sorted reviews ─── */
  const sorted = useMemo(() => {
    const list = [...reviews];
    switch (sort) {
      case 'helpful':
        list.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
        break;
      case 'highest':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        list.sort((a, b) => a.rating - b.rating);
        break;
      case 'recent':
      default:
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [reviews, sort]);

  return (
    <section className="mt-10 sm:mt-14 pt-6 sm:pt-10 border-t border-amir-dark/10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <MessageSquare size={22} className="text-amir-pink" />
            Customer Reviews
          </h2>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
            {stats.count === 0
              ? 'Be the first to review this product'
              : `${stats.count} review${stats.count !== 1 ? 's' : ''} from real customers`}
          </p>
        </div>

        {!alreadyReviewed && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary text-sm py-2.5 px-4 shrink-0"
          >
            <PenLine size={14} />
            <span className="hidden xs:inline">Write a review</span>
            <span className="xs:hidden">Write</span>
          </button>
        )}
      </div>

            {/* Summary — compact strip */}
      <div className="card px-3 py-2 mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black leading-none">
            {stats.count === 0 ? '—' : stats.avg.toFixed(1)}
          </span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                size={11}
                className={
                  i <= Math.round(stats.avg)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300'
                }
              />
            ))}
          </div>
          <span className="text-[11px] text-amir-dark/50 font-semibold">
            · {stats.count} review{stats.count !== 1 && 's'}
          </span>
        </div>

        {/* Inline mini bars, no labels */}
        {stats.count > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.breakdown[star] || 0;
              const pct = stats.count ? (count / stats.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-amir-dark/50">{star}★</span>
                  <div className="w-10 h-1 bg-amir-cream rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Already-reviewed notice */}
      {alreadyReviewed && !showForm && (
        <div className="mb-5 p-3 rounded-xl bg-emerald-50 border-l-4 border-emerald-400 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <p className="text-xs font-semibold text-emerald-800">
            You already reviewed this product. Thanks for your feedback!
          </p>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <ReviewForm
          product={product}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Sort bar (only if >1 review) */}
      {reviews.length > 1 && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amir-dark/50">
            {reviews.length} review{reviews.length !== 1 && 's'}
          </p>

          <div className="relative shrink-0">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-full pl-3 pr-8 py-1.5 text-xs font-bold focus:ring-2 focus:ring-amir-pink outline-none cursor-pointer"
            >
              <option value="recent">Most recent</option>
              <option value="helpful">Most helpful</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      )}

      {/* Reviews list */}
      {sorted.length === 0 ? (
        <div className="card p-10 sm:p-14 text-center">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-bold text-amir-dark">No reviews yet</p>
          <p className="text-xs text-amir-dark/60 mt-1 max-w-sm mx-auto">
            Be the first to share your thoughts. Your review helps other parents
            make better choices!
          </p>
          {!alreadyReviewed && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-5 inline-flex text-sm"
            >
              <PenLine size={14} /> Write the first review
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}