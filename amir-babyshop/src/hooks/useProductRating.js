import { useMemo } from 'react';
import { useReviews } from '../context/ReviewsContext';

/**
 * Returns the "live" rating for a product.
 * - If the product has reviews → use the average of real reviews
 * - If not → fall back to the seed rating (from products.js)
 *
 * @param {object} product
 * @returns {{ value: number, count: number, hasReviews: boolean }}
 */
export function useProductRating(product) {
  const { getStats } = useReviews();

  return useMemo(() => {
    if (!product) return { value: 0, count: 0, hasReviews: false };

    const stats = getStats(product.id);

    if (stats.count > 0) {
      return {
        value: stats.avg,
        count: stats.count,
        hasReviews: true,
      };
    }

    return {
      value: product.rating || 0,
      count: product.reviews || 0,
      hasReviews: false,
    };
  }, [product, getStats]);
}