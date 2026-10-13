import { useEffect, useState } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import { categories } from '../../data/products';
import { formatCurrency } from '../../utils/format';

export default function FilterPanel({
  open,
  onClose,
  filters,
  setFilters,
  productCount,
  priceBounds,          // { min, max } from catalog
}) {
  const [draft, setDraft] = useState(filters);

  // Sync draft whenever panel opens
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const setField = (key, value) => setDraft(d => ({ ...d, [key]: value }));

  const toggleCategory = (id) => {
    setDraft(d => {
      const has = d.categories.includes(id);
      return {
        ...d,
        categories: has
          ? d.categories.filter(c => c !== id)
          : [...d.categories, id],
      };
    });
  };

  const handleApply = () => {
    setFilters(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft({
      minPrice: '',
      maxPrice: '',
      minRating: 0,
      inStockOnly: false,
      onSaleOnly: false,
      categories: [],
    });
  };

  const hasAnyFilter =
    draft.minPrice || draft.maxPrice || draft.minRating > 0 ||
    draft.inStockOnly || draft.onSaleOnly || draft.categories.length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex md:items-stretch md:justify-start">

      <div
        className="absolute inset-0 bg-black/40 md:bg-black/30"
        onClick={onClose}
      />

      <div
        className="relative ml-auto md:ml-0 md:mr-0 w-full max-w-md h-full bg-white shadow-2xl md:shadow-xl
                   flex flex-col rounded-t-3xl md:rounded-none md:rounded-r-none
                   animate-slide-up md:animate-slide-right
                   self-end md:self-auto md:max-w-sm
                   max-h-[92vh] md:max-h-full"
      >
        <div className="flex items-center justify-between p-4 border-b border-amir-dark/5">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙</span>
            <p className="font-black text-base">Filters</p>
            {hasAnyFilter && (
              <span className="text-[10px] font-bold text-amir-dark/60 bg-amir-pink/30 px-2 py-0.5 rounded-full">
                active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amir-dark/60 mb-2">
              💰 Price range
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.minPrice}
                onChange={e => setField('minPrice', e.target.value)}
                placeholder={priceBounds.min || '0'}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold"
              />
              <span className="text-amir-dark/40 font-bold">—</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.maxPrice}
                onChange={e => setField('maxPrice', e.target.value)}
                placeholder={priceBounds.max || 'Max'}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold"
              />
            </div>
            <p className="text-[10px] text-amir-dark/40 mt-1">
              Catalog range: {formatCurrency(priceBounds.min)} – {formatCurrency(priceBounds.max)}
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: 'Under 1K', min: '', max: '999' },
                { label: '1K – 3K', min: '1000', max: '3000' },
                { label: '3K – 10K', min: '3000', max: '10000' },
                { label: '10K+', min: '10000', max: '' },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, minPrice: preset.min, maxPrice: preset.max }))}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 hover:bg-amir-pink/30 text-amir-dark/70 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amir-dark/60 mb-2">
              ⭐ Minimum rating
            </p>
            <div className="space-y-1.5">
              {[
                { value: 0, label: 'Any rating' },
                { value: 3, label: '3★ and up' },
                { value: 4, label: '4★ and up' },
                { value: 4.5, label: '4.5★ and up' },
              ].map(opt => {
                const active = draft.minRating === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField('minRating', opt.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all ${
                      active
                        ? 'border-amir-pink bg-amir-pink/15'
                        : 'border-gray-200 hover:border-amir-pink/40'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        active ? 'border-amir-pink bg-amir-pink' : 'border-gray-300'
                      }`}
                    >
                      {active && <Check size={12} className="text-amir-dark" />}
                    </span>
                    <span className="text-xs font-bold text-amir-dark">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amir-dark/60 mb-2">
              🎨 Categories
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.filter(c => c.id !== 'all').map(c => {
                const active = draft.categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all ${
                      active
                        ? 'border-amir-pink bg-amir-pink/15'
                        : 'border-gray-200 hover:border-amir-pink/40'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        active ? 'border-amir-pink bg-amir-pink' : 'border-gray-300'
                      }`}
                    >
                      {active && <Check size={10} className="text-amir-dark" />}
                    </span>
                    <span className="text-xs font-bold text-amir-dark truncate">
                      {c.icon} {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amir-dark/60 mb-2">
              ✅ Availability
            </p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setField('inStockOnly', !draft.inStockOnly)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all ${
                  draft.inStockOnly
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    draft.inStockOnly ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                  }`}
                >
                  {draft.inStockOnly && <Check size={10} className="text-white" />}
                </span>
                <span className="text-xs font-bold text-amir-dark">In stock only</span>
              </button>

              <button
                type="button"
                onClick={() => setField('onSaleOnly', !draft.onSaleOnly)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all ${
                  draft.onSaleOnly
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-gray-200 hover:border-rose-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    draft.onSaleOnly ? 'border-rose-500 bg-rose-500' : 'border-gray-300'
                  }`}
                >
                  {draft.onSaleOnly && <Check size={10} className="text-white" />}
                </span>
                <span className="text-xs font-bold text-amir-dark">On sale only</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-amir-dark/5 bg-white space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-xs transition-colors active:scale-[0.99]"
            >
              Apply {typeof productCount === 'number' ? `· ${productCount}` : ''}
            </button>
          </div>
          <p className="text-center text-[10px] text-amir-dark/40 font-semibold">
            Filters apply to your current search
          </p>
        </div>
      </div>
    </div>
  );
}