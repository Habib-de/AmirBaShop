import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import ProductGrid from '../components/Products/ProductGrid';

const CATEGORIES = [
  { id: 'clothing', icon: '👕', label: 'Clothing' },
  { id: 'toys',     icon: '🧸', label: 'Toys' },
  { id: 'feeding',  icon: '🍼', label: 'Feeding' },
  { id: 'gear',     icon: '🚼', label: 'Gear' },
  { id: 'bath',     icon: '🛁', label: 'Bath' },
  { id: 'all',      icon: '🌟', label: 'All' },
];

export default function ShopHome() {
  const { products } = useInventory();
  const featured = products.slice(0, 4);

  return (
    <div className="pb-8">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amir-pink/70 via-amir-purple/40 to-amir-blue/70" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-24">
          <div className="max-w-2xl">
            <h1 className="text-[26px] sm:text-5xl lg:text-6xl font-black leading-[1.05] text-amir-dark whitespace-nowrap sm:whitespace-normal">
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

            <div className="mt-5 sm:mt-7 flex flex-wrap gap-2 sm:gap-3">
              <Link to="/shop" className="btn-primary text-sm sm:text-base py-2.5 px-5 sm:py-3 sm:px-6">
                Shop Now <ArrowRight size={16} className="sm:hidden" />
                <ArrowRight size={18} className="hidden sm:block" />
              </Link>
              <Link to="/shop?cat=toys" className="btn-secondary text-sm sm:text-base py-2.5 px-5 sm:py-3 sm:px-6">
                Explore Toys
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
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

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-3xl font-black">Shop by category</h2>
            <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
              Find exactly what you need
            </p>
          </div>
        </div>

        <MobileCategoryDropdown categories={CATEGORIES} />

        <div className="hidden sm:flex justify-between gap-3">
          {CATEGORIES.map(c => (
            <Link
              key={c.id}
              to={`/shop?cat=${c.id}`}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-2 transition-all duration-200 active:scale-95 hover:opacity-70"
            >
              <span className="text-4xl leading-none">{c.icon}</span>
              <p className="font-bold text-sm text-amir-dark leading-tight text-center">{c.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PICKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
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
        <ProductGrid products={featured} />
      </section>

      {/* PROMO STRIP */}
      {/* <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        <div className="rounded-3xl bg-gradient-to-r from-amir-yellow/60 via-amir-pink/60 to-amir-purple/60 p-6 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
          <div className="relative">
            <p className="mt-2 text-sm sm:text-base text-amir-dark/70 font-semibold">
              Because every child deserves the best of the best
            </p>
            <Link to="/shop" className="btn-primary mt-5 inline-flex">
              Start Shopping <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section> */}
    </div>
  );
}

/* ─── Mobile Category Dropdown ─── */
function MobileCategoryDropdown({ categories }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between card px-4 py-3 font-bold text-sm text-amir-dark active:scale-[0.99] transition-transform"
      >
        <span>Browse categories</span>
        <span className={`transition-transform duration-200 text-amir-dark/60 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-3 gap-2 animate-fade-in">
          {categories.map(c => (
            <Link
              key={c.id}
              to={`/shop?cat=${c.id}`}
              onClick={() => setOpen(false)}
              className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl hover:bg-amir-pink/20 active:scale-95 transition-all"
            >
              <span className="text-2xl leading-none">{c.icon}</span>
              <span className="text-[11px] font-bold text-amir-dark leading-none">{c.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}