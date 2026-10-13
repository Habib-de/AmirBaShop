import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import ProductGrid from './ProductGrid';

const MAX_ITEMS = 4;
const PRICE_RANGE = 0.5; // ±50%

/**
 * RelatedProducts
 * Shows products similar to the current one.
 * Priority: same category → similar price → in stock → top rated.
 */
export default function RelatedProducts({ product }) {
  const { products } = useInventory();
  const { items: recentItems } = useRecentlyViewed();

  const related = useMemo(() => {
    if (!product) return [];

    // Never show current product or recently-viewed ones (avoid overlap)
    const excludeIds = new Set([
      product.id,
      ...recentItems.map(p => p.id),
    ]);

    // Filter candidates: not excluded
    const candidates = products.filter(p => !excludeIds.has(p.id));

    // ── Priority 1: same category ──
    const sameCat = candidates.filter(p => p.category === product.category);

    // ── Priority 2: similar price (±50%) ──
    const minPrice = product.price * (1 - PRICE_RANGE);
    const maxPrice = product.price * (1 + PRICE_RANGE);
    const similarPrice = (list) =>
      list.filter(p => p.price >= minPrice && p.price <= maxPrice);

    // ── Build the final pool ──
    let pool = similarPrice(sameCat);           // best: same cat + similar price
    if (pool.length < MAX_ITEMS) {
      // add more same-cat regardless of price
      const moreSameCat = sameCat.filter(p => !pool.includes(p));
      pool = [...pool, ...moreSameCat];
    }
    if (pool.length < MAX_ITEMS) {
      // add similar-price from other categories
      const otherCatSimilarPrice = similarPrice(candidates.filter(p => p.category !== product.category));
      pool = [...pool, ...otherCatSimilarPrice.filter(p => !pool.includes(p))];
    }
    if (pool.length < MAX_ITEMS) {
      // last resort: any other product
      pool = [...pool, ...candidates.filter(p => !pool.includes(p))];
    }

    // ── Sort: in-stock first, then by rating desc ──
    pool.sort((a, b) => {
      const aInStock = a.stock > 0 ? 1 : 0;
      const bInStock = b.stock > 0 ? 1 : 0;
      if (aInStock !== bInStock) return bInStock - aInStock;
      return (b.rating || 0) - (a.rating || 0);
    });

    return pool.slice(0, MAX_ITEMS);
  }, [product, products, recentItems]);

  // Don't render if not enough similar products
  if (related.length < 2) return null;

  return (
    <section className="mt-10 sm:mt-14 pt-6 sm:pt-10 border-t border-amir-dark/10">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Sparkles size={22} className="text-amir-pink" />
            You may also like
          </h2>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
            Similar picks from our collection
          </p>
        </div>
      </div>
      <ProductGrid products={related} />
    </section>
  );
}