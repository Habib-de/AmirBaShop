import {
  Package, AlertTriangle, XCircle, DollarSign, Search, Plus, X,
  ChevronDown, Trash2, Layers, Bell, Tags, Loader2, Pencil,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import {
  useInventory,
  getTotalStock,
  parseVariantKey,
  variantKey,
} from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { useExtras } from '../context/ExtrasContext';
import { formatCurrency } from '../utils/format';
import { apiRequest } from '../services/api';
import Skeleton from '../components/UI/Skeleton';
import { useDelayedReady } from '../hooks/useDelayedReady';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════
   LOCAL CACHE of categories for the Add Stock form
   ═══════════════════════════════════════════════════════════ */
let CATEGORIES_CACHE = [];

export default function Inventory() {
  const {
    products,
    loading,
    error,
    reload,
    updateVariantStock,
    addProduct,
    updateProduct,
    deleteProduct,
    lowStock,
    outOfStock,
    totalValue,
  } = useInventory();
  const { isOwner, isSales } = useAuth();
  const { getSubscribersForVariant, notifyStockRestored } = useExtras();

  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const ready = useDelayedReady(400);

  /* ═══ Load categories once ═══ */
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const list = await apiRequest('/categories/all', { auth: true });
      const arr = Array.isArray(list) ? list : [];
      setCategories(arr);
      CATEGORIES_CACHE = arr;
    } catch (err) {
      toast.error(err?.message || 'Failed to load categories');
      setCategories([]);
      CATEGORIES_CACHE = [];
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner || isSales) {
      loadCategories();
    }
  }, [isOwner, isSales]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
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

  const handleVariantChange = async (product, size, color, oldStock, newStock) => {
    try {
      await updateVariantStock(product.id, size, color, newStock);
    } catch (err) {
      // Context already rolled back the optimistic update
      toast.error(err?.message || 'Failed to update stock');
      return;
    }
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

  const handleAdd = async (product) => {
    try {
      await addProduct(product);
      toast.success('Product added', { icon: '✅' });
      setShowForm(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to add product');
    }
  };

  const handleEditSubmit = async (payload) => {
    try {
      await updateProduct(editing.id, payload);
      toast.success('Product updated', { icon: '✏️' });
      setEditing(null);
    } catch (err) {
      toast.error(err?.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async (p) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(p.id);
      setExpanded(null);
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your stock in real time · {products.length} products
          </p>
        </div>

        {(isOwner || isSales) && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCategories(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-amir-pink text-amir-dark font-bold text-xs sm:text-sm transition-colors shadow-sm"
              title="Manage categories"
            >
              <Tags size={15} />
              <span className="hidden xs:inline">Categories</span>
              {categories.length > 0 && (
                <span className="bg-gray-100 text-gray-600 text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {categories.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-colors shadow-sm"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              <span className="hidden xs:inline">{showForm ? 'Cancel' : 'Add Stock'}</span>
            </button>
          </div>
        )}
      </div>

      {/* LOAD ERROR (no more silent empty lists) */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-rose-700">⚠️ {error}</p>
          <button
            onClick={reload}
            disabled={loading}
            className="px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 disabled:opacity-50"
          >
            {loading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {/* CATEGORIES MODAL */}
      {showCategories && (
        <CategoriesModal
          categories={categories}
          loading={categoriesLoading}
          onClose={() => setShowCategories(false)}
          onChanged={loadCategories}
        />
      )}

      {/* ADD STOCK FORM */}
      {showForm && (
        <ProductForm
          mode="add"
          categories={categories}
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* EDIT PRODUCT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white">
            <ProductForm
              key={editing.id}
              mode="edit"
              product={editing}
              categories={categories}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
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
      {!ready || (loading && products.length === 0) ? (
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

              const totalWaiting = hasVariants
                ? Object.keys(p.variants).reduce((sum, key) => {
                    const { size, color } = parseVariantKey(p, key);
                    return sum + getSubscribersForVariant(p.id, size, color);
                  }, 0)
                : 0;

              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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
                        <span className="text-[10px] font-mono text-gray-500 truncate">{p.sku || '—'}</span>
                        <span className="text-[9px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-500 truncate capitalize">{p.category || 'other'}</span>

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

                      {hasVariants ? (
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
                              <Layers size={10} /> Stock by variant
                            </p>
                            <p className="text-[9px] text-gray-400">Click − / + to adjust</p>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(p.variants).map(([key, variant]) => {
                              const { size: displaySize, color: displayColor } = parseVariantKey(p, key);
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
                                <div key={key} className={`flex items-center gap-2 p-2 rounded-lg border ${variantStatus}`}>
                                  {variant.image && (
                                    <img
                                      src={variant.image}
                                      alt={label}
                                      className="w-9 h-9 rounded-md object-cover border border-white shrink-0"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  )}
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
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">Stock</p>
                          <p className="text-xs text-gray-500">
                            This product has no size/color variants — stock is tracked as a single number.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => handleVariantChange(p, null, null, totalStock, totalStock - 1)} disabled={totalStock === 0} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-rose-100 hover:text-rose-600 font-bold transition-colors disabled:opacity-40">−</button>
                            <span className="w-10 text-center font-bold">{totalStock}</span>
                            <button onClick={() => handleVariantChange(p, null, null, totalStock, totalStock + 1)} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-600 font-bold transition-colors">+</button>
                            <button onClick={() => handleVariantChange(p, null, null, totalStock, totalStock + 5)} className="px-3 h-9 rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-600 font-bold text-xs transition-colors">+5</button>
                            <button onClick={() => handleVariantChange(p, null, null, totalStock, totalStock + 10)} className="px-3 h-9 rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-600 font-bold text-xs transition-colors">+10</button>
                          </div>
                        </div>
                      )}

                      {p.description && (
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">Description</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{p.description}</p>
                        </div>
                      )}

                      {(isOwner || isSales) && (
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => setEditing(p)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold text-amir-dark bg-white border border-gray-200 hover:border-amir-pink hover:bg-pink-50 transition-colors"
                          >
                            <Pencil size={13} /> Edit product
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
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

/* ═══════════════════════════════════════════════════════════
   CATEGORIES MODAL
   ═══════════════════════════════════════════════════════════ */
function CategoriesModal({ categories, loading, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/categories', {
        method: 'POST',
        auth: true,
        body: {
          name: name.trim(),
          icon: icon.trim() || null,
        },
      });
      setName('');
      setIcon('');
      toast.success('Category created', { icon: '📂' });
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete "${cat.name}"? Products using it may break.`)) return;
    try {
      await apiRequest(`/categories/${cat.id}`, { method: 'DELETE', auth: true });
      toast.success('Category deleted');
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-slide-up">

        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="font-black text-base flex items-center gap-2">
              <Tags size={18} className="text-amir-pink" />
              Categories
            </p>
            <p className="text-[11px] text-amir-dark/50">
              {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} in your shop
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-9 h-9 hover:bg-rose-50 text-gray-400 hover:text-rose-500 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">

          {/* Existing categories */}
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 size={24} className="mx-auto text-amir-pink animate-spin mb-2" />
              <p className="text-xs font-bold text-amir-dark/60">Loading categories…</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-xl">
              <p className="text-3xl mb-2">📂</p>
              <p className="text-xs font-bold text-amir-dark/70">No categories yet</p>
              <p className="text-[10px] text-amir-dark/50 mt-0.5">
                Add your first category below
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <span className="text-base shrink-0">{cat.icon || '📦'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 truncate">{cat.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      ID: {cat.id} · slug: {cat.slug}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="w-8 h-8 rounded-full bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0 transition-colors"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create form */}
          <form onSubmit={handleCreate} className="pt-3 border-t border-amir-dark/5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60">
              Add new category
            </p>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Shoes, Accessories"
                maxLength={80}
                disabled={submitting}
                className="input"
              />
              <input
                type="text"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="👟"
                maxLength={4}
                disabled={submitting}
                className="input w-16 text-center"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Plus size={14} /> Create category
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT FORM — used for both "Add stock" and "Edit product"
   Stock is entered per size × colour (not split evenly).
   ═══════════════════════════════════════════════════════════ */
const splitList = (str) =>
  [...new Set(String(str || '').split(',').map(s => s.trim()).filter(Boolean))];

const buildCombos = (sizes, colors) => {
  const rows = sizes.length ? sizes : [null];
  const cols = colors.length ? colors : [null];
  return rows.flatMap(size =>
    cols.map(color => ({ size, color, key: variantKey(size, color) }))
  );
};

const FIELD =
  'w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-semibold';

function ProductForm({ mode = 'add', product = null, categories = [], onSubmit, onCancel }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(() => ({
    name: product?.name || '',
    categoryId: product?.categoryId || categories[0]?.id || '',
    price: product?.price != null ? String(product.price) : '',
    image: product?.image || '',
    description: product?.description || '',
    sizes: (product?.sizes || []).join(', '),
    colors: (product?.colors || []).join(', '),
    singleStock: product ? String(product.stock ?? 0) : '',
  }));

  // qty[variantKey] = "5"  — kept in state so values survive while you edit the size/colour lists
  const [qty, setQty] = useState(() => {
    const q = {};
    Object.entries(product?.variants || {}).forEach(([k, v]) => {
      q[k] = String(v?.stock ?? 0);
    });
    return q;
  });
  // imgs[variantKey] = image URL for that exact size+colour
  const [imgs, setImgs] = useState(() => {
    const m = {};
    Object.entries(product?.variants || {}).forEach(([k, v]) => {
      if (v?.image) m[k] = v.image;
    });
    return m;
  });
  const [submitting, setSubmitting] = useState(false);

  // Categories load asynchronously — pick the first one once they arrive
  useEffect(() => {
    if (!form.categoryId && categories.length > 0) {
      setForm(f => ({ ...f, categoryId: categories[0].id }));
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const sizes = useMemo(() => splitList(form.sizes), [form.sizes]);
  const colors = useMemo(() => splitList(form.colors), [form.colors]);
  const useVariants = sizes.length > 0 || colors.length > 0;
  const combos = useMemo(() => buildCombos(sizes, colors), [sizes, colors]);
  // One photo per colour: fills every size of that colour (you can still override per size)
  const setColorImage = (color, url) =>
    setImgs(m => {
      const next = { ...m };
      combos.filter(c => c.color === color).forEach(c => { next[c.key] = url; });
      return next;
    });
  const variantTotal = combos.reduce((sum, c) => sum + (parseInt(qty[c.key]) || 0), 0);

  const selectedCategory = categories.find(c => c.id === Number(form.categoryId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    let variants;
    let stock;
    if (useVariants) {
      variants = {};
      combos.forEach(c => {
        const entry = { stock: Math.max(0, parseInt(qty[c.key]) || 0) };
        const img = (imgs[c.key] || '').trim();
        if (img) entry.image = img;
        variants[c.key] = entry;
      });
      stock = variantTotal;
    } else {
      variants = null;
      stock = Math.max(0, parseInt(form.singleStock) || 0);
    }

    const payload = {
      name: form.name.trim(),
      category: selectedCategory.slug,
      categoryId: selectedCategory.id,
      price: parseFloat(form.price) || 0,
      stock,
      image:
        form.image.trim() ||
        'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600',
      description: form.description.trim(),
      sizes: isEdit ? sizes : (sizes.length ? sizes : undefined),
      colors: isEdit ? colors : (colors.length ? colors : undefined),
      variants: isEdit ? variants : (variants || undefined),
    };

    if (!isEdit) {
      payload.rating = 5;
      payload.reviews = 0;
      payload.sku = `${(selectedCategory.slug || 'PRD').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 border-l-4 border-l-amir-pink animate-fade-in"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base sm:text-lg text-gray-900">
          {isEdit ? `✏️ Edit ${product?.name || 'product'}` : '📦 Add new stock'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="w-8 h-8 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center transition-colors disabled:opacity-40"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {categories.length === 0 && (
        <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs font-bold text-amber-800">⚠️ No categories yet</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Create at least one category first (use the "Categories" button above).
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <input
          required
          className={`${FIELD} sm:col-span-2`}
          placeholder="Product name *"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          disabled={submitting}
        />

        <select
          className={FIELD}
          value={form.categoryId}
          onChange={e => setForm({ ...form, categoryId: e.target.value })}
          disabled={submitting || categories.length === 0}
        >
          {categories.length === 0 ? (
            <option value="">— No categories —</option>
          ) : (
            categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.icon || ''} {c.name}
              </option>
            ))
          )}
        </select>

        <input
          required
          type="number"
          step="0.01"
          min="0"
          className={FIELD}
          placeholder="Price (KES) *"
          value={form.price}
          onChange={e => setForm({ ...form, price: e.target.value })}
          disabled={submitting}
        />

        <input
          className={FIELD}
          placeholder="Sizes, comma-separated (e.g. 0-3M, 3-6M)"
          value={form.sizes}
          onChange={e => setForm({ ...form, sizes: e.target.value })}
          disabled={submitting}
        />
        <input
          className={FIELD}
          placeholder="Colours, comma-separated (e.g. Pink, Blue)"
          value={form.colors}
          onChange={e => setForm({ ...form, colors: e.target.value })}
          disabled={submitting}
        />

        {/* STOCK — per size × colour, or a single number */}
        {useVariants ? (
          <div className="sm:col-span-2 bg-gray-50 rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                <Layers size={11} /> Stock for each variant
              </p>
              <p className="text-xs font-bold text-gray-800">Total: {variantTotal}</p>
            </div>
            {colors.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                  Photo for each colour (used for all its sizes)
                </p>
                {colors.map(color => {
                  const first = combos.find(c => c.color === color);
                  return (
                    <div key={color} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs font-bold text-gray-700 truncate">{color}</span>
                      <input
                        type="url"
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-gray-200 focus:border-amir-pink outline-none text-xs font-semibold bg-white"
                        placeholder={`Image URL for ${color}`}
                        value={imgs[first?.key] || ''}
                        onChange={e => setColorImage(color, e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-2">
              {combos.map(c => {
                const label = [c.size, c.color].filter(Boolean).join(' · ');
                return (
                  <div
                    key={c.key}
                    className="bg-white border border-gray-200 rounded-lg p-2 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      {imgs[c.key] && (
                        <img
                          src={imgs[c.key]}
                          alt=""
                          className="w-8 h-8 rounded object-cover border border-gray-100 shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <span className="flex-1 min-w-0 text-xs font-bold text-gray-700 truncate">
                        {label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        className="w-20 text-center text-sm font-bold bg-gray-50 border border-gray-200 rounded-md py-1 focus:outline-none focus:border-amir-pink"
                        value={qty[c.key] ?? ''}
                        placeholder="0"
                        onChange={e => setQty(q => ({ ...q, [c.key]: e.target.value }))}
                        disabled={submitting}
                      />
                    </div>
                    <input
                      type="url"
                      className="w-full px-2.5 py-1.5 rounded-md border border-gray-200 focus:border-amir-pink outline-none text-[11px] font-semibold bg-gray-50"
                      placeholder="Image URL for this exact variant (optional)"
                      value={imgs[c.key] || ''}
                      onChange={e => setImgs(m => ({ ...m, [c.key]: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <input
            required
            type="number"
            min="0"
            className={`${FIELD} sm:col-span-2`}
            placeholder="Quantity in stock * (add sizes/colours above to set stock per variant)"
            value={form.singleStock}
            onChange={e => setForm({ ...form, singleStock: e.target.value })}
            disabled={submitting}
          />
        )}

        <input
          className={`${FIELD} sm:col-span-2`}
          placeholder="Image URL (optional)"
          value={form.image}
          onChange={e => setForm({ ...form, image: e.target.value })}
          disabled={submitting}
        />

        <textarea
          required
          rows={3}
          className={`${FIELD} resize-none sm:col-span-2`}
          placeholder="Description *"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          disabled={submitting}
        />
      </div>

      <div className="mt-4 flex flex-col xs:flex-row gap-2">
        <button
          type="submit"
          disabled={submitting || categories.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-amir-dark border-t-transparent animate-spin" />
              {isEdit ? 'Saving…' : 'Adding…'}
            </>
          ) : isEdit ? (
            <>Save changes</>
          ) : (
            <>
              <Plus size={16} /> Add to inventory
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}