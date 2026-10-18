import {
  createContext, useContext, useEffect, useState, useMemo, useCallback,
} from 'react';
import { inventoryService } from '../services/api';
import { useAuth } from './AuthContext';

const InventoryContext = createContext();
export const useInventory = () => useContext(InventoryContext);

/* ═══════════════════════════════════════════════════════════
   VARIANT HELPERS
   ═══════════════════════════════════════════════════════════ */

export const variantKey = (size, color) =>
  `${size || '_'}-${color || '_'}`;

/**
 * Reverse of variantKey. Sizes can contain hyphens (e.g. "0-3M"), so a plain
 * key.split('-') is wrong. We match against the product's known sizes first
 * (longest first), then fall back to splitting on the first hyphen.
 */
export const parseVariantKey = (product, key) => {
  const sizes = [...(product?.sizes || [])].sort((a, b) => b.length - a.length);

  for (const s of sizes) {
    if (key.startsWith(`${s}-`)) {
      const color = key.slice(s.length + 1);
      return { size: s, color: color === '_' ? null : color };
    }
  }

  const i = key.indexOf('-');
  if (i === -1) return { size: key === '_' ? null : key, color: null };
  const size = key.slice(0, i);
  const color = key.slice(i + 1);
  return {
    size: size === '_' ? null : size,
    color: color === '_' ? null : color,
  };
};

/** Image saved on one exact size+colour variant ('' if none). */
export const getVariantImage = (product, size, color) => {
  if (!product) return '';
  return product.variants?.[variantKey(size, color)]?.image || '';
};

/** First image saved for a colour (any size); falls back to the product image. */
export const getColorImage = (product, color) => {
  if (!product) return '';
  if (product.variants && color) {
    for (const [key, v] of Object.entries(product.variants)) {
      if (v?.image && parseVariantKey(product, key).color === color) return v.image;
    }
  }
  return product.image || '';
};

export const getVariantStock = (product, size, color) => {
  if (!product) return 0;
  if (!product.variants) return product.stock ?? 0;
  const key = variantKey(size, color);
  return product.variants[key]?.stock ?? 0;
};

export const getTotalStock = (product) => {
  if (!product) return 0;
  if (!product.variants) return product.stock ?? 0;
  return Object.values(product.variants)
    .reduce((sum, v) => sum + (v.stock || 0), 0);
};

export const isVariantInStock = (product, size, color) =>
  getVariantStock(product, size, color) > 0;

export const isProductOutOfStock = (product) =>
  getTotalStock(product) === 0;

/* ═══════════════════════════════════════════════════════════
   PROVIDER — API IS THE SOURCE OF TRUTH
   ═══════════════════════════════════════════════════════════ */
export function InventoryProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refetch whenever the logged-in user changes (login / logout / token swap).
  // NOTE: InventoryProvider must be rendered inside <AuthProvider>.
  const auth = useAuth();
  const userId = auth?.user?.id ?? null;

  /* ─── Single load function used by mount, login change, and retry ─── */
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await inventoryService.list();
      if (!Array.isArray(list)) throw new Error('Backend returned non-array');
      setProducts(list);
    } catch (err) {
      console.error('[Inventory] fetch failed:', err);
      setError(err?.message || 'Failed to load inventory');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload, userId]);

  /* ═══════════════════════════════════════════════════════════
     MUTATIONS — optimistic UI + rollback on failure
     ═══════════════════════════════════════════════════════════ */

  const updateStock = async (id, stock) => {
    const prev = products;
    const safe = Math.max(0, stock);
    setProducts(list => list.map(p =>
      p.id === id ? { ...p, stock: safe } : p
    ));
    try {
      await inventoryService.update(id, { stock: safe });
    } catch (err) {
      console.error('[Inventory] updateStock failed:', err);
      setProducts(prev);
      throw err;
    }
  };

  const updateVariantStock = async (productId, size, color, newStock) => {
    const prev = products;
    const safeStock = Math.max(0, Number(newStock) || 0);

    setProducts(list => list.map(p => {
      if (p.id !== productId) return p;
      const key = variantKey(size, color);
      const updatedVariants = {
        ...(p.variants || {}),
        [key]: { ...(p.variants?.[key] || {}), stock: safeStock },
      };
      const totalStock = Object.values(updatedVariants)
        .reduce((sum, v) => sum + (v.stock || 0), 0);
      return { ...p, variants: updatedVariants, stock: totalStock };
    }));

    try {
      await inventoryService.setVariantStock(productId, size, color, safeStock);
    } catch (err) {
      console.error('[Inventory] setVariantStock failed:', err);
      setProducts(prev);
      throw err;
    }
  };

  const deductVariantStock = async (productId, size, color, qty) => {
    const prev = products;
    setProducts(list => list.map(p => {
      if (p.id !== productId) return p;
      const key = variantKey(size, color);
      const current = p.variants?.[key]?.stock ?? p.stock ?? 0;
      const newStock = Math.max(0, current - qty);
      const updatedVariants = {
        ...(p.variants || {}),
        [key]: { ...(p.variants?.[key] || {}), stock: newStock },
      };
      const totalStock = Object.values(updatedVariants)
        .reduce((sum, v) => sum + (v.stock || 0), 0);
      return { ...p, variants: updatedVariants, stock: totalStock };
    }));
    try {
      await inventoryService.deductVariantStock(productId, size, color, qty);
    } catch (err) {
      console.error('[Inventory] deductVariantStock failed:', err);
      setProducts(prev);
      throw err;
    }
  };

  const restoreVariantStock = async (productId, size, color, qty) => {
    const prev = products;
    setProducts(list => list.map(p => {
      if (p.id !== productId) return p;
      const key = variantKey(size, color);
      const current = p.variants?.[key]?.stock ?? p.stock ?? 0;
      const newStock = current + qty;
      const updatedVariants = {
        ...(p.variants || {}),
        [key]: { ...(p.variants?.[key] || {}), stock: newStock },
      };
      const totalStock = Object.values(updatedVariants)
        .reduce((sum, v) => sum + (v.stock || 0), 0);
      return { ...p, variants: updatedVariants, stock: totalStock };
    }));
    try {
      await inventoryService.restoreVariantStock(productId, size, color, qty);
    } catch (err) {
      console.error('[Inventory] restoreVariantStock failed:', err);
      setProducts(prev);
      throw err;
    }
  };

  const addProduct = async (product) => {
    const created = await inventoryService.create({
      name: product.name,
      categoryId: product.categoryId,
      sku: product.sku,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      imageUrl: product.image,
      badge: product.badge,
      sizes: product.sizes,
      colors: product.colors,
      variants: product.variants,
      totalStock: product.stock ?? 0,
    });
    // Reload from backend so the list reflects what the server actually has
    await reload();
    return created;
  };

  /**
   * Edit a product. `patch` uses the FRONTEND shape (image, stock, ...);
   * it is mapped to the backend DTO shape (imageUrl, totalStock, ...),
   * then the list is reloaded so the UI shows exactly what the server saved.
   */
  const updateProduct = async (id, patch) => {
    const { image, stock, category, ...rest } = patch;
    const body = { ...rest };
    if (image !== undefined) body.imageUrl = image;
    if (stock !== undefined) body.totalStock = stock;
    try {
      await inventoryService.update(id, body);
    } catch (err) {
      console.error('[Inventory] updateProduct failed:', err);
      throw err;
    }
    await reload();
  };

  const deleteProduct = async (id) => {
    const prev = products;
    setProducts(list => list.filter(p => p.id !== id));
    try {
      await inventoryService.remove(id);
    } catch (err) {
      console.error('[Inventory] deleteProduct failed:', err);
      setProducts(prev);
      throw err;
    }
  };

  /* ═══ Stats ═══ */
  const lowStock = useMemo(() => products.filter(p => {
    const total = getTotalStock(p);
    return total > 0 && total <= 10;
  }), [products]);

  const outOfStock = useMemo(
    () => products.filter(p => getTotalStock(p) === 0),
    [products]
  );

  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + (p.price || 0) * getTotalStock(p), 0),
    [products]
  );

  return (
    <InventoryContext.Provider value={{
      products,
      loading,
      error,
      reload,
      updateStock,
      updateVariantStock,
      deductVariantStock,
      restoreVariantStock,
      addProduct,
      updateProduct,
      deleteProduct,
      lowStock,
      outOfStock,
      totalValue,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}