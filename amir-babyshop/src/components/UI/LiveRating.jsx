import { Star } from 'lucide-react';
import { useProductRating } from '../../hooks/useProductRating';

/**
 * Same visual as <Rating>, but pulls the LIVE average from reviews.
 * Falls back to the product's seed rating if there are no reviews yet.
 */
export default function LiveRating({ product, size = 14, showCount = true }) {
  const { value, count, hasReviews } = useProductRating(product);

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={size}
            className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 font-semibold">
        {value > 0 ? value.toFixed(1) : '—'}
        {showCount && count > 0 && (
          <>
            {' '}({count})
            {hasReviews && (
              <span className="ml-1 text-emerald-600 font-bold">• Live</span>
            )}
          </>
        )}
      </span>
    </div>
  );
}