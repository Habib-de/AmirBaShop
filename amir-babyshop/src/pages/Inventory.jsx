import {
  Package, AlertTriangle, XCircle, DollarSign, Search, Plus, X,
  ChevronDown, Trash2, Layers, Bell,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  useInventory,
  getTotalStock,
  getVariantStock,
  variantKey,
} from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { useExtras } from '../context/ExtrasContext';
import { formatCurrency } from '../utils/format';
import Skeleton from '../components/UI/Skeleton';
import { useDelayedReady } from '../hooks/useDelayedReady';
import toast from 'react-hot-toast';

export default function Inventory() {
  const {
    products,
    updateVariantStock,
    addProduct,
    deleteProduct,
    lowStock,
    outOfStock,
    totalValue,
  } = useInventory();
  const { isOwner, isSales } = useAuth();
  const { getSubscribersForVariant, notifyStockRestored } = useExtras();

  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const ready = useDelayedReady(400);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, query]);

  const stats = [
    { label: 'Total Products', value: products.length,   icon: Package,       color: 'blue'  },
    { label: 'Low Stock',      value: lowStock.length,   icon: AlertTriangle, color: 'amber' },
    { label: 'Out of Stock',   value: outOfStock.length, icon: XCircle,       color: 'rose'  },
    { label: 'Stock Value',    value: formatCurrency(totalValue), icon: DollarSign, color: 'green' },
  ];

  const colorMap = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600'   },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600'  },
    rose:   { bg: 'bg-rose-50',   text: 'text-rose-600'   },
    green:  { bg: 'bg-green-50',  text: 'text-green-600'  },
  };

  const getStatus = (stock) => {
    if (stock === 0) return { label: 'Out of stock', cls: 'bg-rose-100 text-rose-700' };
    if (stock <= 10) return { label: 'Low stock',    cls: 'bg-amber-100 text-amber-700' };
    return { label: 'In stock', cls: 'bg-green-100 text-green-700' };
  };

  /* 🎯 Update variant stock + auto-notify subscribers if restocked from 0 */
  const handleVariantChange = (product, size, color, oldStock, newStock) => {
    updateVariantStock(product.id, size, color, newStock);

    // If stock went from 0 → positive, notify subscribers
    if (oldStock === 0 && newStock > 0) {
      const count = notifyStockRestored(product.id, size, color, product.name);
      if (count > 0) {
        toast.success(
          `${count} customer${count !== 1 ? 's' : ''} notified about restock`,
          { icon: '🔔' }
        );
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your stock in real time · {products.length} products
          </p>
        </div>

        {(isOwner || isSales) && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-colors shadow-sm"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span className="hidden xs:inline">{showForm ? 'Cancel' : 'Add Stock'}</span>
          </button>
        )}
      </div>

      {/* ADD STOCK FORM */}
      {showForm && (
        <AddStockForm
          onAdd={(product) => {
            addProduct(product);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* KPI CARDS */}
      {!ready ? (
        <Skeleton.KpiGrid count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {stats.map((s, i) => {
            const c = colorMap[s.color];
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold truncate">
                      {s.label}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate text-gray-900">
                      {s.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${c.bg} ${c.text} flex-shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LOW STOCK ALERT */}
      {ready && lowStock.length > 0 && (
        <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl border-l-4 border-amber-300 bg-amber-50">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-800">Low stock alert</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {lowStock.length} product{lowStock.length !== 1 && 's'} need restocking:{' '}
              <span className="font-semibold">
                {lowStock.slice(0, 3).map(p => p.name).join(', ')}
                {lowStock.length > 3 && ` +${lowStock.length - 3} more`}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or SKU..."
          className="w-full pl-11 pr-11 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amir-pink focus:border-amir-pink outline-none text-sm font-semibold"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* PRODUCTS LIST */}
      {!ready ? (
        <Skeleton.List count={6} />
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="font-bold text-gray-700">No products found</p>
              <p className="text-xs text-gray-500 mt-1">
                {query ? 'Try a different search' : 'Add your first product to get started'}
              </p>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="mt-4 px-4 py-2 bg-amir-pink text-amir-dark rounded-xl text-xs font-bold hover:bg-pink-400 transition"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filtered.map(p => {
              const totalStock = getTotalStock(p);
              const status = getStatus(totalStock);
              const isOpen = expanded === p.id;
              const hasVariants = p.variants && Object.keys(p.variants).length > 0;
              const variantCount = hasVariants ? Object.keys(p.variants).length : 0;
              const outOfStockVariants = hasVariants
                ? Object.values(p.variants).filter(v => (v.stock || 0) === 0).length
                : 0;

              // Total waiting (subscribers across all sold-out variants)
              const totalWaiting = hasVariants
                ? Object.entries(p.variants).reduce((sum, [key]) => {
                    const [size, color] = key.split('-');
                    const dSize = size === '_' ? null : size;
                    const dColor = color === '_' ? null : color;
                    return sum + getSubscribersForVariant(p.id, dSize, dColor);
                  }, 0)
                : 0;

              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

                  {/* Header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="w-full text-left p-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-11 h-11 rounded-lg object-cover shrink-0 border border-gray-100"
                      onError={(e) => { e.target.src = 'https://placehold.co/100x100/f3f4f6/9ca3af?text=?'; }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-gray-900 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-500 truncate">{p.sku}</span>
                        <span className="text-[9px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-500 truncate capitalize">{p.category}</span>

                        {hasVariants && (
                          <>
                            <span className="text-[9px] text-gray-400">·</span>
                            <span className="text-[10px] text-amir-pink font-bold inline-flex items-center gap-0.5">
                              <Layers size={9} /> {variantCount} variants
                              {outOfStockVariants > 0 && (
                                <span className="text-rose-500 ml-1">
                                  ({outOfStockVariants} sold out)
                                </span>
                              )}
                            </span>
                          </>
                        )}

                        {totalWaiting > 0 && (
                          <>
                            <span className="text-[9px] text-gray-400">·</span>
                            <span className="text-[10px] text-amber-600 font-bold inline-flex items-center gap-0.5">
                              <Bell size={9} /> {totalWaiting} waiting
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(p.price)}</p>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold mt-0.5 ${status.cls}`}>
                          {totalStock} · {status.label}
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Expanded panel */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-3 sm:p-4 bg-gray-50/50 animate-fade-in space-y-3">

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">In Stock</p>
                          <p className="text-lg font-bold text-gray-900 mt-0.5">{totalStock}</p>
                          <p className="text-[9px] text-gray-500">total units</p>
                        </div>
                        <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Unit Price</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{formatCurrency(p.price)}</p>
                          <p className="text-[9px] text-gray-500">per unit</p>
                        </div>
                        <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Total Value</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                            {formatCurrency(p.price * totalStock)}
                          </p>
                          <p className="text-[9px] text-gray-500">KES</p>
                        </div>
                      </div>

                      {/* VARIANT BREAKDOWN */}
                      {hasVariants ? (
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
                              <Layers size={10} /> Stock by variant
                            </p>
                            <p className="text-[9px] text-gray-400">
                              Click − / + to adjust
                            </p>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(p.variants).map(([key, variant]) => {
                              const [size, color] = key.split('-');
                              const displaySize = size === '_' ? null : size;
                              const displayColor = color === '_' ? null : color;
                              const label = [displaySize, displayColor].filter(Boolean).join(' · ');
                              const stock = variant.stock || 0;

                              const waitingCount = getSubscribersForVariant(p.id, displaySize, displayColor);

                              const variantStatus = stock === 0
                                ? 'bg-rose-50 border-rose-100'
                                : stock <= 5
                                ? 'bg-amber-50 border-amber-100'
                                : 'bg-emerald-50 border-emerald-100';

                              const textColor = stock === 0
                                ? 'text-rose-700'
                                : stock <= 5
                                ? 'text-amber-700'
                                : 'text-emerald-700';

                              return (
                                <div
                                  key={key}
                                  className={`flex items-center gap-2 p-2 rounded-lg border ${variantStatus}`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-bold truncate ${textColor}`}>
                                      {label || 'Standard'}
                                      {stock === 0 && (
                                        <span className="ml-1.5 text-[9px] uppercase tracking-wider">
                                          · Sold out
                                        </span>
                                      )}
                                    </p>
                                    {waitingCount > 0 && (
                                      <p className="text-[10px] text-amber-700 font-bold mt-0.5 inline-flex items-center gap-1">
                                        <Bell size={9} /> {waitingCount} customer{waitingCount !== 1 ? 's' : ''} waiting
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleVariantChange(p, displaySize, displayColor, stock, stock - 1)}
                                      disabled={stock === 0}
                                      className="w-7 h-7 rounded-md bg-white hover:bg-gray-100 border border-gray-200 font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      aria-label="Decrease"
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stock}
                                      onChange={(e) => {
                                        const newVal = parseInt(e.target.value) || 0;
                                        handleVariantChange(p, displaySize, displayColor, stock, newVal);
                                      }}
                                      className="w-14 text-center text-xs font-bold bg-white border border-gray-200 rounded-md py-1 focus:outline-none focus:border-amir-pink"
                                    />
                                    <button
                                      onClick={() => handleVariantChange(p, displaySize, displayColor, stock, stock + 1)}
                                      className="w-7 h-7 rounded-md bg-white hover:bg-gray-100 border border-gray-200 font-bold text-xs transition-colors"
                                      aria-label="Increase"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">
                            Stock
                          </p>
                          <p className="text-xs text-gray-500">
                            This product has no size/color variants — stock is tracked as a single number.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleVariantChange(p, null, null, totalStock, totalStock - 1)}
                              disabled={totalStock === 0}
                              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-rose-100 hover:text-rose-600 font-bold transition-colors disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-bold">{totalStock}</span>
                            <button
                              onClick={() => handleVariantChange(p, null, null, totalStock, totalStock + 1)}
                              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-600 font-bold transition-colors"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleVariantChange(p, null, null, totalStock, totalStock + 5)}
                              className="px-3 h-9 rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-600 font-bold text-xs transition-colors"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleVariantChange(p, null, null, totalStock, totalStock + 10)}
                              className="px-3 h-9 rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-600 font-bold text-xs transition-colors"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {p.description && (
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">
                            Description
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed">{p.description}</p>
                        </div>
                      )}

                      {/* Delete */}
                      {(isOwner || isSales) && (
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                                deleteProduct(p.id);
                                setExpanded(null);
                              }
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={13} /> Delete product
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────── Add Stock Form ───────────── */
function AddStockForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    category: 'clothing',
    price: '',
    stock: '',
    image: '',
    description: '',
    sizes: '',
    colors: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const sizes = form.sizes.split(',').map(s => s.trim()).filter(Boolean);
    const colors = form.colors.split(',').map(s => s.trim()).filter(Boolean);

    onAdd({
      name: form.name.trim(),
      category: form.category,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock) || 0,
      image: form.image.trim() || 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600',
      description: form.description.trim(),
      rating: 5,
      reviews: 0,
      sku: `${form.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      sizes: sizes.length > 0 ? sizes : undefined,
      colors: colors.length > 0 ? colors : undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 border-l-4 border-l-amir-pink animate-fade-in"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base sm:text-lg text-gray-900">📦 Add new stock</h2>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input
          required
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold sm:col-span-2"
          placeholder="Product name *"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />

        <select
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold"
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
        >
          <option value="clothing">Clothing</option>
          <option value="toys">Toys</option>
          <option value="feeding">Feeding</option>
          <option value="gear">Gear</option>
          <option value="bath">Bath</option>
        </select>

        <input
          required
          type="number"
          step="0.01"
          min="0"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold"
          placeholder="Price (KES) *"
          value={form.price}
          onChange={e => setForm({ ...form, price: e.target.value })}
        />

        <input
          required
          type="number"
          min="0"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold sm:col-span-2"
          placeholder="Total quantity in stock *"
          value={form.stock}
          onChange={e => setForm({ ...form, stock: e.target.value })}
        />

        <input
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold"
          placeholder="Sizes (comma-separated, e.g. S,M,L)"
          value={form.sizes}
          onChange={e => setForm({ ...form, sizes: e.target.value })}
        />
        <input
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold"
          placeholder="Colors (comma-separated, e.g. Pink,Blue)"
          value={form.colors}
          onChange={e => setForm({ ...form, colors: e.target.value })}
        />

        <input
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold sm:col-span-2"
          placeholder="Image URL (optional)"
          value={form.image}
          onChange={e => setForm({ ...form, image: e.target.value })}
        />

        <textarea
          required
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold resize-none sm:col-span-2"
          placeholder="Description *"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <p className="text-[10px] text-gray-500 mt-2">
        💡 If you fill in sizes/colors, stock will be split evenly across all variants.
      </p>

      <div className="mt-4 flex flex-col xs:flex-row gap-2">
        <button
          type="submit"
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-colors"
        >
          <Plus size={16} /> Add to inventory
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}