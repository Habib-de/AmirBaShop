import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Grid, List, X, ShoppingCart, Package,
  Clock, TrendingUp, ArrowRight,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { categories } from '../data/products';
import { formatCurrency } from '../utils/format';
import ProductGrid from '../components/Products/ProductGrid';
import Skeleton from '../components/UI/Skeleton';
import { useDelayedReady } from '../hooks/useDelayedReady';

const RECENT_KEY = 'amir_recent_searches';
const MAX_RECENT = 5;
const MAX_SUGGESTIONS = 6;

export default function Shop() {
  const { products } = useInventory();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeCat = params.get('cat') || 'all';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(() => localStorage.getItem('amir_shop_sort') || 'featured');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('amir_shop_view') || 'grid');

  /* 🔍 Search suggestions state */
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

  /* Category chips scroll */
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

  /* ─── Filtered list (main catalog) ─── */
  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCat !== 'all') list = list.filter(p => p.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => b.rating - a.rating); break;
      default: break;
    }
    return list;
  }, [products, activeCat, query, sort]);

  /* 🔍 Suggestion list (based on query) */
  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    return products
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [products, query]);

  /* 🔥 Trending: top-rated products (fallback when query empty) */
  const trending = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);
  }, [products]);

  const setCat = (id) => {
    if (id === 'all') setParams({});
    else setParams({ cat: id });
  };

  /* 📝 Save recent search */
  const saveRecent = (text) => {
    const clean = text.trim();
    if (!clean) return;
    const updated = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch {}
  };

  /* 📝 Clear recent searches */
  const clearRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  };

  /* Click outside → close dropdown */
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

  /* Select a suggestion */
  const pickProduct = (p) => {
    saveRecent(query || p.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    navigate(`/product/${p.id}`);
  };

  /* Apply the current query as filter */
  const applyQuery = (text) => {
    const t = (text ?? query).trim();
    setQuery(t);
    saveRecent(t);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  /* Keyboard navigation */
  const handleKeyDown = (e) => {
    const items = query.length >= 2 ? suggestions : [];
    const total = items.length + (query.length >= 2 ? 1 : 0); // +1 for "Search for" row

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-8">

      {/* Header */}
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

      {/* Search + Sort */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">

        {/* 🔍 Search with autocomplete */}
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
            placeholder="Search products..."
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

          {/* 🎯 Suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">

              {/* Query is being typed (2+ chars) */}
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

                      {/* Search for "xxx" row */}
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
                /* Query empty or too short → show trending + recent */
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

        {/* Sort dropdown */}
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

      {/* Category chips */}
      <div className="relative mb-4 -mx-4 sm:mx-0">
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

      {/* Content */}
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
            {(query || activeCat !== 'all') && (
              <button
                onClick={() => { setQuery(''); setCat('all'); }}
                className="px-4 py-2 bg-amir-pink text-amir-dark rounded-xl text-xs sm:text-sm font-bold hover:bg-pink-400 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <ProductGrid products={filtered} />
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <ShopListRow key={p.id} product={p} onAdd={() => addItem(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Highlight matched text in name ─── */
function highlightName(name, query) {
  if (!query.trim()) return name;
  const q = query.trim();
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
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

/* ─── Compact List Row ─── */
function ShopListRow({ product, onAdd }) {
  const outOfStock = product.stock === 0;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all flex">
      <Link
        to={`/product/${product.id}`}
        className="w-20 sm:w-28 aspect-square shrink-0 bg-amir-cream overflow-hidden"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
      </Link>

      <div className="flex-1 min-w-0 p-2.5 sm:p-3 flex flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/product/${product.id}`} className="min-w-0 flex-1">
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
        </div>

        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] sm:text-[10px] bg-amir-pink/20 text-amir-dark px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {product.category}
            </span>
            {product.stock > 0 && product.stock <= 10 && (
              <span className="text-[9px] sm:text-[10px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full font-bold">
                Only {product.stock} left
              </span>
            )}
          </div>

          <button
            onClick={onAdd}
            disabled={outOfStock}
            className="bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold py-1.5 px-3 rounded-full text-xs inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <ShoppingCart size={12} />
            <span className="hidden xs:inline">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}