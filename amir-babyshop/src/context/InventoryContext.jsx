import { createContext, useContext, useEffect, useState } from 'react';
import { products as seed } from '../data/products';

const InventoryContext = createContext();
export const useInventory = () => useContext(InventoryContext);

// 👇 Bump this when data/products.js changes to force re-seed
const SEED_VERSION = 5;

/* ═══════════════════════════════════════════════════════════
   VARIANT HELPERS
   ═══════════════════════════════════════════════════════════ */

/* Build a variant key from size + color */
export const variantKey = (size, color) =>
  `${size || '_'}-${color || '_'}`;

/* Get stock for a specific variant of a product */
export const getVariantStock = (product, size, color) => {
  if (!product) return 0;
  if (!product.variants) return product.stock ?? 0;      // legacy fallback
  const key = variantKey(size, color);
  return product.variants[key]?.stock ?? 0;
};

/* Total stock = sum of all variants (or legacy stock) */
export const getTotalStock = (product) => {
  if (!product) return 0;
  if (!product.variants) return product.stock ?? 0;
  return Object.values(product.variants)
    .reduce((sum, v) => sum + (v.stock || 0), 0);
};

/* Is a specific variant in stock? */
export const isVariantInStock = (product, size, color) =>
  getVariantStock(product, size, color) > 0;

/* Is the whole product out of stock? */
export const isProductOutOfStock = (product) =>
  getTotalStock(product) === 0;

/* ═══════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════ */
export function InventoryProvider({ children }) {
  const [products, setProducts] = useState(() => {
    try {
      const savedVersion = Number(localStorage.getItem('amir_inventory_version'));
      const saved = JSON.parse(localStorage.getItem('amir_inventory'));

      if (!saved || savedVersion !== SEED_VERSION) {
        return seed;
      }
      return saved;
    } catch {
      return seed;
    }
  });

  useEffect(() => {
    localStorage.setItem('amir_inventory', JSON.stringify(products));
    localStorage.setItem('amir_inventory_version', String(SEED_VERSION));
  }, [products]);

  /* ═══════════════════════════════════════════════════════════
     LEGACY: update total stock (for products without variants)
     ═══════════════════════════════════════════════════════════ */
  const updateStock = (id, stock) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, stock: Math.max(0, stock) } : p
    ));
  };

  /* ═══════════════════════════════════════════════════════════
     🎯 SET a specific variant's stock to a number
     ═══════════════════════════════════════════════════════════ */
  const updateVariantStock = (productId, size, color, newStock) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;

      const key = variantKey(size, color);
      const safeStock = Math.max(0, Number(newStock) || 0);

      const updatedVariants = {
        ...(p.variants || {}),
        [key]: { ...(p.variants?.[key] || {}), stock: safeStock },
      };

      const totalStock = Object.values(updatedVariants)
        .reduce((sum, v) => sum + (v.stock || 0), 0);

      return { ...p, variants: updatedVariants, stock: totalStock };
    }));
  };

  /* ═══════════════════════════════════════════════════════════
     🎯 DEDUCT stock for a variant (order confirmed)
     ═══════════════════════════════════════════════════════════ */
  const deductVariantStock = (productId, size, color, qty) => {
    setProducts(prev => prev.map(p => {
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
  };

  /* ═══════════════════════════════════════════════════════════
     🎯 RESTORE stock for a variant (order cancelled)
     ═══════════════════════════════════════════════════════════ */
  const restoreVariantStock = (productId, size, color, qty) => {
    setProducts(prev => prev.map(p => {
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
  };

  /* ═══════════════════════════════════════════════════════════
     ADD product (auto-creates variants if sizes/colors provided)
     ═══════════════════════════════════════════════════════════ */
  const addProduct = (product) => {
    const id = Math.max(0, ...products.map(p => p.id)) + 1;

    let variants = product.variants;
    if (!variants && (product.sizes?.length || product.colors?.length)) {
      const sizes = product.sizes?.length ? product.sizes : ['_'];
      const colors = product.colors?.length ? product.colors : ['_'];
      const initialStock = product.stock ?? 0;
      const perVariant = Math.floor(initialStock / (sizes.length * colors.length));

      variants = {};
      sizes.forEach(s => colors.forEach(c => {
        variants[variantKey(s, c)] = { stock: perVariant };
      }));
    }

    const totalStock = variants
      ? Object.values(variants).reduce((s, v) => s + (v.stock || 0), 0)
      : (product.stock ?? 0);

    setProducts(prev => [...prev, {
      ...product,
      id,
      variants: variants || product.variants,
      stock: totalStock,
    }]);
  };

  /* ─── Update product (any field) ─── */
  const updateProduct = (id, patch) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  /* ─── Delete product ─── */
  const deleteProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  /* ═══════════════════════════════════════════════════════════
     STATS (variant-aware)
     ═══════════════════════════════════════════════════════════ */
  const lowStock = products.filter(p => {
    const total = getTotalStock(p);
    return total > 0 && total <= 10;
  });

  const outOfStock = products.filter(p => getTotalStock(p) === 0);

  const totalValue = products.reduce(
    (sum, p) => sum + p.price * getTotalStock(p),
    0
  );

  return (
    <InventoryContext.Provider value={{
      products,
      // legacy
      updateStock,
      // 🎯 variant-aware
      updateVariantStock,
      deductVariantStock,
      restoreVariantStock,
      // product CRUD
      addProduct,
      updateProduct,
      deleteProduct,
      // stats
      lowStock,
      outOfStock,
      totalValue,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}