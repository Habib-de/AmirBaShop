import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Grid, List, X, ShoppingCart, Package,
  Clock, TrendingUp, ArrowRight, Filter,
} from 'lucide-react';
import {
  useInventory,
  getTotalStock,
  getVariantStock,
  getColorImage,
  parseVariantKey,
} from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { categories } from '../data/products';
import { formatCurrency } from '../utils/format';
import ProductGrid from '../components/Products/ProductGrid';
import Skeleton from '../components/UI/Skeleton';
import { useDelayedReady } from '../hooks/useDelayedReady';
import SEO from '../components/SEO';
import { buildBreadcrumbSchema } from '../utils/seoHelpers';
import FilterPanel from '../components/Shop/FilterPanel';

const RECENT_KEY = 'amir_recent_searches';
const MAX_RECENT = 5;
const MAX_SUGGESTIONS = 6;

const EMPTY_FILTERS = {
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  inStockOnly: false,
  onSaleOnly: false,
  categories: [],
};

/* ═══════════════════════════════════════════════════════════
   COLOUR HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Units in stock for one colour (all sizes added together). */
const colorStock = (product, color) => {
  if (!product.variants) return product.stock ?? 0;
  return Object.entries(product.variants).reduce((sum, [key, v]) => {
    return parseVariantKey(product, key).color === color
      ? sum + (v?.stock || 0)
      : sum;
  }, 0);
};

/** "Pink" → "pink", "Light Blue" → "lightblue". Returns null if the browser doesn't know it. */
const colorToCss = (name) => {
  const n = String(name || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!n) return null;
  if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', n)) return n;
  return null;
};

function ColorDot({ name, selected, soldOut, onClick, small = false }) {
  const css = colorToCss(name);
  return (
    <button
      type="button"
      onClick={onClick}
      title={soldOut ? `${name} — sold out` : name}
      aria-label={soldOut ? `${name}, sold out` : name}
      aria-pressed={selected}
      className={`relative rounded-full border-2 flex items-center justify-center shrink-0 transition ${
        small ? 'w-5 h-5' : 'w-6 h-6'
      } ${
        selected
          ? 'border-amir-dark ring-2 ring-amir-pink'
          : 'border-gray-200 hover:border-amir-pink'
      } ${soldOut ? 'opacity-50' : ''}`}
      style={css ? { backgroundColor: css } : { backgroundColor: '#f3f4f6' }}
    >
      {!css && (
        <span className="text-[9px] font-black text-gray-600">
          {String(name).charAt(0).toUpperCase()}
        </span>
      )}
      {soldOut && (
        <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
          <span className="block w-full h-[2px] bg-gray-600 rotate-45" />
        </span>
      )}
    </button>
  );
}

export default function Shop() {
  const { products } = useInventory();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeCat = params.get('cat') || 'all';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(() => localStorage.getItem('amir_shop_sort') || 'featured');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('amir_shop_view') || 'grid');

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [activeColors, setActiveColors] = useState([]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch { return []; }
  });

  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const ready = useDelayedReady(400);

  const chipsRef = useRef(null);
  const [activeDot, setActiveDot] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => { localStorage.setItem('amir_shop_sort', sort); }, [sort]);
  useEffect(() => { localStorage.setItem('amir_shop_view', viewMode); }, [viewMode]);

  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
    setDotCount(pages);
  }, [activeCat]);

  const handleChipsScroll = (e) => {
    const el = e.currentTarget;
    const { scrollLeft, scrollWidth, clientWidth } = el;

    if (scrollWidth <= clientWidth) {
      setDotCount(1);
      setActiveDot(0);
      return;
    }

    const pages = Math.max(1, Math.ceil(scrollWidth / clientWidth));
    const progress = scrollLeft / (scrollWidth - clientWidth);
    const currentPage = Math.round(progress * (pages - 1));

    setDotCount(pages);
    setActiveDot(currentPage);
  };

  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    const prices = products.map(p => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  /* Every colour that exists in the shop, most common first */
  const allColors = useMemo(() => {
    const counts = new Map();
    products.forEach(p =>
      (p.colors || []).forEach(c => counts.set(c, (counts.get(c) || 0) + 1))
    );
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [products]);

  const toggleColor = (name) =>
    setActiveColors(list =>
      list.includes(name) ? list.filter(c => c !== name) : [...list, name]
    );

  const filtered = useMemo(() => {
    let list = [...products];

    /* Category filter — product.category is a slug like "clothing" */
    if (activeCat !== 'all') {
      list = list.filter(p => (p.category || '') === activeCat);
    }

    if (filters.categories.length > 0) {
      list = list.filter(p => filters.categories.includes(p.category));
    }

    if (filters.minPrice !== '') {
      const min = Number(filters.minPrice) || 0;
      list = list.filter(p => p.price >= min);
    }
    if (filters.maxPrice !== '') {
      const max = Number(filters.maxPrice) || Infinity;
      list = list.filter(p => p.price <= max);
    }

    if (filters.minRating > 0) {
      list = list.filter(p => (p.rating || 0) >= filters.minRating);
    }

    /* Stock now counts every size/colour, not just the stored total */
    if (filters.inStockOnly) {
      list = list.filter(p => getTotalStock(p) > 0);
    }

    if (filters.onSaleOnly) {
      list = list.filter(p => p.originalPrice && p.originalPrice > p.price);
    }

    /* Colour filter — product must have one of the chosen colours IN STOCK */
    if (activeColors.length > 0) {
      list = list.filter(p =>
        (p.colors || []).some(c => activeColors.includes(c) && colorStock(p, c) > 0)
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.colors || []).some(c => c.toLowerCase().includes(q)) ||
        (p.sizes || []).some(s => s.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      default: break;
    }
    return list;
  }, [products, activeCat, query, sort, filters, activeColors]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.minPrice !== '' || filters.maxPrice !== '') n++;
    if (filters.minRating > 0) n++;
    if (filters.inStockOnly) n++;
    if (filters.onSaleOnly) n++;
    if (filters.categories.length > 0) n++;
    return n;
  }, [filters]);

  const clearAllFilters = () => {
    setFilters(EMPTY_FILTERS);
    setActiveColors([]);
  };

  const removeFilter = (key, value) => {
    setFilters(f => {
      if (key === 'price') return { ...f, minPrice: '', maxPrice: '' };
      if (key === 'rating') return { ...f, minRating: 0 };
      if (key === 'inStock') return { ...f, inStockOnly: false };
      if (key === 'onSale') return { ...f, onSaleOnly: false };
      if (key === 'category') return { ...f, categories: f.categories.filter(c => c !== value) };
      return f;
    });
  };

  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    return products
      .filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.colors || []).some(c => c.toLowerCase().includes(q))
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [products, query]);

  const trending = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);
  }, [products]);

  const setCat = (id) => {
    if (id === 'all') setParams({});
    else setParams({ cat: id });
  };

  const saveRecent = (text) => {
    const clean = text.trim();
    if (!clean) return;
    const updated = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch {}
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  };

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pickProduct = (p) => {
    saveRecent(query || p.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    navigate(`/product/${p.id}`);
  };

  const applyQuery = (text) => {
    const t = (text ?? query).trim();
    setQuery(t);
    saveRecent(t);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    const items = query.length >= 2 ? suggestions : [];
    const total = items.length + (query.length >= 2 ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex(prev => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < items.length) {
        pickProduct(items[highlightedIndex]);
      } else {
        applyQuery();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const currentCat = categories.find(c => c.id === activeCat);
  const title = activeCat === 'all'
    ? 'Shop'
    : `${currentCat?.icon || ''} ${currentCat?.name || 'Shop'}`.trim();

  const seoTitle = activeCat === 'all'
    ? 'Shop All Products'
    : `${currentCat?.name || 'Shop'} Collection`;

  const seoDescription = activeCat === 'all'
    ? 'Browse our full collection of baby clothes, toys, and essentials. Quality products, curated with love in Mombasa, Kenya.'
    : `Shop our ${currentCat?.name?.toLowerCase() || 'collection'} at AMIR BabyShop. Quality baby products, fast delivery in Kenya.`;

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Shop', url: '/shop' },
    ...(activeCat !== 'all' ? [{ name: currentCat?.name || 'Shop', url: `/shop?cat=${activeCat}` }] : []),
  ];

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        url={activeCat === 'all' ? '/shop' : `/shop?cat=${activeCat}`}
        jsonLd={buildBreadcrumbSchema(breadcrumbItems)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-8">

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black text-gray-800 flex items-center gap-1.5 sm:gap-2">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-amir-pink" />
                <span className="truncate">{title}</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-400 font-semibold">
                Shop our curated selection of baby products.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">

          <div className="flex-1 relative min-w-[180px]" ref={searchRef}>
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search products, colours, sizes..."
              className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-amir-pink focus:border-amir-pink outline-none text-xs sm:text-sm font-semibold"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">

                {query.trim().length >= 2 ? (
                  <>
                    {suggestions.length > 0 ? (
                      <>
                        {suggestions.map((p, i) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseEnter={() => setHighlightedIndex(i)}
                            onClick={() => pickProduct(p)}
                            className={`w-full text-left flex items-center gap-2.5 p-2.5 transition-colors border-b border-gray-50 last:border-b-0 ${
                              highlightedIndex === i ? 'bg-amir-pink/20' : 'hover:bg-gray-50'
                            }`}
                          >
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-amir-cream"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-amir-dark truncate">
                                {highlightName(p.name, query)}
                              </p>
                              <p className="text-[10px] text-amir-dark/50 font-semibold truncate">
                                {formatCurrency(p.price)} · <span className="capitalize">{p.category}</span>
                              </p>
                            </div>
                            <ArrowRight size={12} className="text-amir-dark/30 shrink-0" />
                          </button>
                        ))}

                        <button
                          type="button"
                          onMouseEnter={() => setHighlightedIndex(suggestions.length)}
                          onClick={() => applyQuery()}
                          className={`w-full text-left flex items-center gap-2 p-3 border-t border-gray-100 transition-colors ${
                            highlightedIndex === suggestions.length ? 'bg-amir-pink/20' : 'hover:bg-gray-50'
                          }`}
                        >
                          <Search size={12} className="text-amir-pink shrink-0" />
                          <p className="text-xs font-bold text-amir-dark">
                            Search for "<span className="text-amir-pink">{query}</span>"
                          </p>
                        </button>
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs font-bold text-amir-dark/70">No products found</p>
                        <p className="text-[10px] text-amir-dark/50 mt-0.5">Try a different keyword</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {recentSearches.length > 0 && (
                      <div className="p-2">
                        <div className="flex items-center justify-between px-2 py-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/40 flex items-center gap-1">
                            <Clock size={10} /> Recent
                          </p>
                          <button
                            type="button"
                            onClick={clearRecent}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600"
                          >
                            Clear
                          </button>
                        </div>
                        {recentSearches.slice(0, 3).map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyQuery(r)}
                            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Clock size={11} className="text-amir-dark/40 shrink-0" />
                            <span className="text-xs font-semibold text-amir-dark truncate">
                              {r}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {trending.length > 0 && (
                      <div className="p-2 border-t border-gray-50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/40 px-2 py-1.5 flex items-center gap-1">
                          <TrendingUp size={10} /> Trending
                        </p>
                        {trending.slice(0, 4).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => pickProduct(p)}
                            className="w-full text-left flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0 bg-amir-cream"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-amir-dark truncate">
                                {p.name}
                              </p>
                              <p className="text-[10px] text-amir-dark/50 font-semibold">
                                ⭐ {p.rating} · {formatCurrency(p.price)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 font-bold text-xs sm:text-sm transition-colors ${
              activeFilterCount > 0
                ? 'border-amir-pink bg-amir-pink/20 text-amir-dark'
                : 'border-gray-200 bg-white text-gray-600 hover:border-amir-pink/50'
            }`}
          >
            <Filter size={14} />
            <span className="hidden xs:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-amir-dark text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="relative shrink-0">
            <SlidersHorizontal className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg pl-8 sm:pl-9 pr-6 sm:pr-8 py-2 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amir-pink outline-none appearance-none cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low</option>
              <option value="price-desc">Price: High</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {(filters.minPrice !== '' || filters.maxPrice !== '') && (
              <FilterChip
                label={`💰 ${filters.minPrice || priceBounds.min} – ${filters.maxPrice || priceBounds.max}`}
                onRemove={() => removeFilter('price')}
              />
            )}
            {filters.minRating > 0 && (
              <FilterChip
                label={`⭐ ${filters.minRating}★ & up`}
                onRemove={() => removeFilter('rating')}
              />
            )}
            {filters.inStockOnly && (
              <FilterChip
                label="✅ In stock"
                onRemove={() => removeFilter('inStock')}
              />
            )}
            {filters.onSaleOnly && (
              <FilterChip
                label="🏷️ On sale"
                onRemove={() => removeFilter('onSale')}
              />
            )}
            {filters.categories.map(cat => {
              const c = categories.find(x => x.id === cat);
              return (
                <FilterChip
                  key={cat}
                  label={`${c?.icon || ''} ${c?.name || cat}`}
                  onRemove={() => removeFilter('category', cat)}
                />
              );
            })}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="relative mb-3 -mx-4 sm:mx-0">
          <div
            ref={chipsRef}
            onScroll={handleChipsScroll}
            className="px-4 sm:px-0 overflow-x-auto hide-scrollbar scroll-smooth"
          >
            <div className="flex gap-1.5 min-w-max pb-1">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                    activeCat === c.id
                      ? 'bg-amir-pink text-amir-dark shadow-sm'
                      : 'bg-transparent text-gray-500 hover:text-amir-dark hover:bg-amir-pink/10'
                  }`}
                >
                  <span>{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {dotCount > 1 && (
            <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
              {Array.from({ length: dotCount }).map((_, i) => (
                <span
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeDot ? 'w-4 h-1.5 bg-amir-pink' : 'w-1.5 h-1.5 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* COLOUR FILTER — only colours that exist in your inventory */}
        {allColors.length > 0 && (
          <div className="mb-4 -mx-4 sm:mx-0">
            <div className="px-4 sm:px-0 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-1.5 min-w-max pb-1">
                <span className="text-[11px] font-bold text-gray-400 mr-1">Colour</span>
                {allColors.map(({ name }) => {
                  const on = activeColors.includes(name);
                  const css = colorToCss(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleColor(name)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border-2 text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors ${
                        on
                          ? 'border-amir-dark bg-amir-pink/30 text-amir-dark'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-amir-pink'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                        style={{ backgroundColor: css || '#f3f4f6' }}
                      />
                      {name}
                    </button>
                  );
                })}
                {activeColors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveColors([])}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1"
                  >
                    Clear colours
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {ready && filtered.length > 0 && (
          <p className="text-[11px] sm:text-xs font-bold text-amir-dark/50 mb-3">
            Showing {filtered.length} of {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        )}

        {!ready ? (
          viewMode === 'grid' ? <Skeleton.ProductGrid count={8} /> : <Skeleton.List count={6} />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-600">No products found</h3>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Try adjusting your search or filters
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {(query || activeCat !== 'all' || activeFilterCount > 0 || activeColors.length > 0) && (
                <button
                  onClick={() => { setQuery(''); setCat('all'); clearAllFilters(); }}
                  className="px-4 py-2 bg-amir-pink text-amir-dark rounded-xl text-xs sm:text-sm font-bold hover:bg-pink-400 transition"
                >
                  Clear everything
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <ProductGrid products={filtered} />
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <ShopListRow
                key={p.id}
                product={p}
                preferredColors={activeColors}
                onAdd={() => addItem(p)}
              />
            ))}
          </div>
        )}
      </div>

      <FilterPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        productCount={filtered.length}
        priceBounds={priceBounds}
      />
    </>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-amir-pink/20 text-amir-dark text-[11px] font-bold">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-5 h-5 rounded-full hover:bg-amir-pink/40 flex items-center justify-center transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

function highlightName(name, query) {
  if (!query.trim()) return name;
  const q = query.trim();
  const idx = (name || '').toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-amir-pink/50 text-amir-dark rounded px-0.5">
        {name.slice(idx, idx + q.length)}
      </mark>
      {name.slice(idx + q.length)}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   LIST ROW — colour-aware
   • tap a colour dot → picture changes to that colour's photo
   • stock + sizes shown for the chosen colour
   • products with sizes/colours open the product page to pick
   ═══════════════════════════════════════════════════════════ */
function ShopListRow({ product, onAdd, preferredColors = [] }) {
  const navigate = useNavigate();

  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const hasOptions = colors.length > 0 || sizes.length > 0;

  const totalStock = getTotalStock(product);
  const outOfStock = totalStock === 0;

  const [color, setColor] = useState(() =>
    preferredColors.find(c => colors.includes(c)) ||
    colors.find(c => colorStock(product, c) > 0) ||
    colors[0] ||
    null
  );

  // If the shop-wide colour filter changes, jump to that colour on this card
  useEffect(() => {
    const match = preferredColors.find(c => colors.includes(c));
    if (match) setColor(match);
  }, [preferredColors]); // eslint-disable-line react-hooks/exhaustive-deps

  const image = (color ? getColorImage(product, color) : product.image) || product.image;
  const shownStock = color ? colorStock(product, color) : totalStock;
  const detailUrl = `/product/${product.id}${color ? `?color=${encodeURIComponent(color)}` : ''}`;

  const handleAction = () => {
    if (hasOptions) navigate(detailUrl);
    else onAdd();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all flex">
      <Link
        to={detailUrl}
        className="w-20 sm:w-28 aspect-square shrink-0 bg-amir-cream overflow-hidden"
      >
        <img
          src={image}
          alt={color ? `${product.name} — ${color}` : product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.currentTarget.src = product.image; }}
        />
      </Link>

      <div className="flex-1 min-w-0 p-2.5 sm:p-3 flex flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link to={detailUrl} className="min-w-0 flex-1">
              <h3 className="font-bold text-xs sm:text-sm leading-tight line-clamp-2 text-gray-800 hover:text-amir-dark">
                {product.name}
              </h3>
            </Link>
            <span className="font-black text-sm sm:text-base shrink-0 text-gray-800">
              {formatCurrency(product.price)}
            </span>
          </div>

          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1">
            {product.description}
          </p>

          {/* Colour dots */}
          {colors.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {colors.map(c => (
                <ColorDot
                  key={c}
                  name={c}
                  small
                  selected={color === c}
                  soldOut={colorStock(product, c) === 0}
                  onClick={() => setColor(c)}
                />
              ))}
              {color && (
                <span className="text-[10px] font-bold text-gray-500 ml-0.5">{color}</span>
              )}
            </div>
          )}

          {/* Sizes for the chosen colour */}
          {sizes.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {sizes.map(s => {
                const left = getVariantStock(product, s, color);
                return (
                  <span
                    key={s}
                    className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md border font-bold ${
                      left > 0
                        ? 'border-gray-200 text-gray-600 bg-white'
                        : 'border-gray-100 text-gray-300 line-through bg-gray-50'
                    }`}
                    title={left > 0 ? `${left} left` : 'Sold out'}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] sm:text-[10px] bg-amir-pink/20 text-amir-dark px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {product.category}
            </span>
            {shownStock === 0 && !outOfStock && (
              <span className="text-[9px] sm:text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                {color} sold out
              </span>
            )}
            {shownStock > 0 && shownStock <= 10 && (
              <span className="text-[9px] sm:text-[10px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full font-bold">
                Only {shownStock} left
              </span>
            )}
            {outOfStock && (
              <span className="text-[9px] sm:text-[10px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full font-bold">
                Sold out
              </span>
            )}
          </div>

          <button
            onClick={handleAction}
            disabled={outOfStock}
            className="bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold py-1.5 px-3 rounded-full text-xs inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <ShoppingCart size={12} />
            <span className="hidden xs:inline">{hasOptions ? 'Choose' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}