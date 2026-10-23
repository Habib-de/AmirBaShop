import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Heart, ChevronDown, Truck, CreditCard,
  RotateCcw, Star, MessageCircle, Sparkles, Leaf, PackageCheck,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useReviews } from '../context/ReviewsContext';
import ProductGrid from '../components/Products/ProductGrid';
import SEO from '../components/SEO';
import { buildOrganizationSchema, buildWebsiteSchema } from '../utils/seoHelpers';

const CATEGORIES = [
  { id: 'clothing', icon: '👕', label: 'Clothing' },
  { id: 'toys',     icon: '🧸', label: 'Toys' },
  { id: 'feeding',  icon: '🍼', label: 'Feeding' },
  { id: 'gear',     icon: '🚼', label: 'Gear' },
  { id: 'bath',     icon: '🛁', label: 'Bath' },
  { id: 'all',      icon: '🌟', label: 'All' },
];

const TRUST_ITEMS = [
  { icon: Truck,      title: 'Fast delivery',    sub: 'Nationwide, 1–3 days' },
  { icon: CreditCard, title: 'M-Pesa & Card',    sub: 'Safe checkout' },
  { icon: RotateCcw,  title: 'Easy returns',     sub: 'Within 14 days' },
  { icon: Star,       title: 'Loved by parents', sub: 'Real reviews' },
];

const WHY_ITEMS = [
  {
    icon: Leaf,
    title: 'Gentle on skin',
    body: 'Soft, breathable fabrics tested for sensitive baby skin.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety first',
    body: 'Every toy and essential meets certified safety standards.',
  },
  {
    icon: PackageCheck,
    title: 'Ready to gift',
    body: 'Neatly packed and delivered with care — no wrapping needed.',
  },
];

export default function ShopHome() {
  const { products } = useInventory();
  const { reviews, getStats } = useReviews();

  /* ── Real "featured": top-rated products, fallback to newest ── */
  const featured = useMemo(() => {
    if (!products?.length) return [];
    const rated = products
      .filter(p => (p.rating || 0) > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return (rated.length >= 4 ? rated : [...products]).slice(0, 4);
  }, [products]);

  /* ── Avg rating across catalog ── */
  const avgRating = useMemo(() => {
    if (!products?.length) return null;
    let totalReviews = 0;
    let totalStars = 0;
    products.forEach(p => {
      const s = getStats(p.id);
      totalReviews += s.count;
      totalStars += s.avg * s.count;
    });
    if (totalReviews === 0) {
      const seed = products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length;
      return seed > 0 ? { avg: seed.toFixed(1), count: 0 } : null;
    }
    return { avg: (totalStars / totalReviews).toFixed(1), count: totalReviews };
  }, [products, getStats]);

  /* ── Top 3 reviews for social proof ── */
  const topReviews = useMemo(() => {
    if (!reviews?.length) return [];
    return [...reviews]
      .filter(r => r.rating >= 4 && r.comment)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
      .map(r => ({
        ...r,
        product: products?.find(p => p.id === r.productId),
      }));
  }, [reviews, products]);

  /* ── Category counts (for badges) ── */
  const categoryCounts = useMemo(() => {
    if (!products?.length) return {};
    const map = {};
    products.forEach(p => {
      const key = (p.category || '').toLowerCase();
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [products]);

  const loading = !products;
  const isEmpty = !loading && featured.length === 0;

  return (
    <>
      <SEO
        title="Home"
        description="Shop quality baby clothes, toys, and essentials at AMIR BabyShop. Curated with love in Mombasa, Kenya. Free browsing, fast delivery."
        url="/"
        jsonLd={[buildOrganizationSchema(), buildWebsiteSchema()]}
      />

      <div className="pb-24 sm:pb-14 space-y-10 sm:space-y-14">

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amir-pink/70 via-amir-purple/40 to-amir-blue/70" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-24">
            <div className="max-w-2xl">
              <h1 className="text-[26px] sm:text-5xl lg:text-6xl font-black leading-[1.05] text-amir-dark">
                Everything your{' '}
                <span className="relative inline-block">
                  little one
                  <span className="absolute -bottom-1 left-0 right-0 h-2 bg-amir-yellow/70 rounded-full -z-10" />
                </span>{' '}
                needs
              </h1>

              <p className="mt-4 sm:mt-5 text-[13px] sm:text-lg text-amir-dark/75 font-semibold max-w-lg leading-snug sm:leading-relaxed">
                Soft clothes, safe toys, and trusted essentials — curated with love by AMIR BabyShop.
              </p>

              {avgRating && (
                <p
                  className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amir-dark/80"
                  aria-live="polite"
                >
                  <span className="flex" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map(i => (
                      <span
                        key={i}
                        className={`text-sm leading-none ${
                          i <= Math.round(Number(avgRating.avg))
                            ? 'text-amber-500'
                            : 'text-amir-dark/25'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </span>
                  {avgRating.avg}
                  {avgRating.count > 0 && (
                    <span className="text-amir-dark/60 font-semibold">
                      · {avgRating.count} review{avgRating.count !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              )}

              <div className="mt-5 sm:mt-7 flex flex-wrap gap-2 sm:gap-3">
                <Link
                  to="/shop?sort=new"
                  className="btn-primary text-sm sm:text-base py-2.5 px-5 sm:py-3 sm:px-6 inline-flex items-center gap-1.5"
                >
                  Shop New Arrivals
                  <ArrowRight size={16} className="sm:hidden" />
                  <ArrowRight size={18} className="hidden sm:block" />
                </Link>
                <Link
                  to="/shop?cat=toys"
                  className="btn-secondary text-sm sm:text-base py-2.5 px-5 sm:py-3 sm:px-6"
                >
                  Explore Toys
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ TRUST STRIP ═══ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-10">
          <div className="card p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {TRUST_ITEMS.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-amir-pink/30 text-amir-dark flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-black text-amir-dark leading-tight truncate">
                      {t.title}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-amir-dark/60 font-semibold leading-tight truncate">
                      {t.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ WHY AMIR ═══ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-3xl font-black">Why parents choose AMIR</h2>
            <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
              Built on trust, delivered with care
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {WHY_ITEMS.map((w, i) => {
              const Icon = w.icon;
              return (
                <div key={i} className="card p-5 sm:p-6">
                  <div className="w-11 h-11 rounded-2xl bg-amir-mint/50 text-emerald-900 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <p className="mt-3 font-black text-sm sm:text-base text-amir-dark">{w.title}</p>
                  <p className="mt-1 text-xs sm:text-sm text-amir-dark/65 font-semibold leading-relaxed">
                    {w.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ BENEFITS (compact 2-up) ═══ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { icon: <ShieldCheck size={20} />, title: 'Safe Materials', sub: 'Certified & tested', bg: 'bg-amir-mint/40' },
              { icon: <Heart size={20} />,       title: 'Made with Love', sub: 'For babies',         bg: 'bg-amir-pink/40' },
            ].map((b, i) => (
              <div key={i} className={`card p-4 sm:p-5 text-center ${b.bg}`}>
                <div className="mx-auto w-10 h-10 rounded-full bg-white flex items-center justify-center text-amir-dark shadow-sm">
                  {b.icon}
                </div>
                <p className="mt-2.5 font-black text-sm sm:text-base">{b.title}</p>
                <p className="text-[11px] sm:text-xs text-amir-dark/60 font-semibold mt-0.5">{b.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CATEGORIES ═══ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-3xl font-black">Shop by category</h2>
              <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
                Find exactly what you need
              </p>
            </div>
          </div>

          <MobileCategoryDropdown categories={CATEGORIES} counts={categoryCounts} />

          <div className="hidden sm:flex justify-between gap-3">
            {CATEGORIES.map(c => {
              const count = c.id === 'all'
                ? products?.length || 0
                : categoryCounts[c.id] || 0;
              return (
                <Link
                  key={c.id}
                  to={`/shop?cat=${c.id}`}
                  className="group flex-1 flex flex-col items-center justify-center gap-2 py-3 rounded-2xl border border-transparent hover:border-amir-pink/40 hover:bg-white/60 transition-all duration-200 active:scale-95"
                >
                  <span className="relative w-16 h-16 rounded-2xl bg-amir-pink/25 flex items-center justify-center text-3xl leading-none shadow-sm group-hover:bg-amir-pink/40 transition-colors">
                    {c.icon}
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amir-dark text-white text-[9px] font-black flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </span>
                  <p className="font-bold text-sm text-amir-dark leading-tight text-center">{c.label}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ═══ FEATURED PICKS ═══ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-3xl font-black">Featured picks</h2>
              <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
                Loved by parents
              </p>
            </div>
            <Link
              to="/shop"
              className="text-sm font-bold text-amir-dark/70 hover:text-amir-dark inline-flex items-center gap-1 shrink-0"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <FeaturedSkeleton />
          ) : isEmpty ? (
            <div className="card p-8 sm:p-10 text-center">
              <p className="font-black text-amir-dark text-sm sm:text-base">New arrivals coming soon</p>
              <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-1">
                We're stocking up. Check back in a little while.
              </p>
              <Link to="/shop" className="btn-secondary mt-4 inline-flex text-sm">
                Browse all products
              </Link>
            </div>
          ) : (
            <ProductGrid products={featured} />
          )}
        </section>

        {/* ═══ SOCIAL PROOF ═══ */}
        {(loading || topReviews.length > 0) && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-3xl font-black">Loved by parents</h2>
                <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
                  Real reviews from real families
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card p-4 space-y-2 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {topReviews.map(r => (
                  <div key={r.id} className="card p-4 flex flex-col">
                    <div className="flex items-center gap-1" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map(i => (
                        <span
                          key={i}
                          className={`text-sm leading-none ${
                            i <= r.rating ? 'text-amber-500' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-amir-dark/85 font-semibold leading-relaxed line-clamp-3">
                      "{r.comment}"
                    </p>
                    <div className="mt-3 pt-3 border-t border-amir-dark/5 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-black text-amir-dark truncate">
                        {r.authorName}
                        {r.verified && <span className="text-emerald-600 ml-1">✓</span>}
                      </p>
                      {r.product && (
                        <Link
                          to={`/product/${r.product.id}`}
                          className="text-[10px] font-bold text-amir-dark/50 hover:text-amir-dark truncate max-w-[45%]"
                        >
                          {r.product.name}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═══ NEWSLETTER / WHATSAPP CAPTURE ═══ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="card p-5 sm:p-8 bg-gradient-to-br from-amir-mint/40 via-white to-amir-pink/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2 py-1 rounded-full">
                  <Sparkles size={12} /> Stay in the loop
                </div>
                <h2 className="mt-2 text-lg sm:text-2xl font-black text-amir-dark leading-tight">
                  Get new arrivals & offers first
                </h2>
                <p className="text-xs sm:text-sm text-amir-dark/65 font-semibold mt-1">
                  Join our WhatsApp list — no spam, just the good stuff.
                </p>
              </div>

              <a
                href="https://wa.me/254700000000?text=Hi%20AMIR%20BabyShop%2C%20I%27d%20like%20to%20join%20your%20updates%20list"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 text-sm shrink-0"
                aria-label="Join AMIR BabyShop updates on WhatsApp"
              >
                <MessageCircle size={16} /> Join on WhatsApp
              </a>
            </div>
          </div>
        </section>

      </div>

      {/* ═══ STICKY MOBILE CTA ═══ */}
      <div className="sm:hidden fixed bottom-4 inset-x-4 z-30">
        <Link
          to="/shop"
          className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3 shadow-lg"
          aria-label="Shop all products"
        >
          Shop now <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}

/* ─── Skeleton fallback for featured grid ─── */
function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-3 space-y-2 animate-pulse">
          <div className="aspect-square rounded-xl bg-gray-200" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

/* ─── Mobile category dropdown ─── */
function MobileCategoryDropdown({ categories, counts = {} }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between card px-4 py-3 font-bold text-sm text-amir-dark active:scale-[0.99] transition-transform"
        aria-expanded={open}
      >
        <span>Browse categories</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 text-amir-dark/60 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-3 gap-2 animate-fade-in">
          {categories.map(c => {
            const count = c.id === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[c.id] || 0;
            return (
              <Link
                key={c.id}
                to={`/shop?cat=${c.id}`}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl hover:bg-amir-pink/20 active:scale-95 transition-all"
              >
                <span className="relative w-12 h-12 rounded-xl bg-amir-pink/25 flex items-center justify-center text-2xl leading-none">
                  {c.icon}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amir-dark text-white text-[9px] font-black flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-amir-dark leading-none">{c.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}