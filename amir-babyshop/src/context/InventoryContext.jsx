import {
  createContext, useContext, useEffect, useState, useMemo, useCallback,
} from 'react';
import { inventoryService } from '../services/api';
import { useAuth } from './AuthContext';

const InventoryContext = createContext();
export const useInventory = () => useContext(InventoryContext);

/* ═══════════════════════════════════════════════════════════
   VARIANT HELPERS — now operate on an ARRAY of variant objects
   ═══════════════════════════════════════════════════════════ */

/** Legacy helper, kept for backward compat (no longer used internally). */
export const variantKey = (size, color) => `${size || '_'}-${color || '_'}`;

/** Find a variant by size + color in the array. Returns the variant object or null. */
export const findVariant = (product, size, color) => {
  if (!product || !Array.isArray(product.variants)) return null;
  const s = size || null;
  const c = color || null;
  return product.variants.find(v =>
    (v.size || null) === s &&
    (v.color || null) === c
  ) || null;
};

/** Legacy parser (still used by some UI pages). */
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
  const v = findVariant(product, size, color);
  return v?.imageUrl || '';
};

/** First image saved for a colour (any size); falls back to the product image. */
export const getColorImage = (product, color) => {
  if (!product) return '';
  if (Array.isArray(product.variants) && color) {
    for (const v of product.variants) {
      if (v.imageUrl && (v.color || null) === (color || null)) return v.imageUrl;
    }
  }
  return product.image || '';
};

export const getVariantStock = (product, size, color) => {
  if (!product) return 0;
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return product.stock ?? 0;
  }
  const v = findVariant(product, size, color);
  return v?.stock ?? 0;
};

export const getTotalStock = (product) => {
  if (!product) return 0;
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return product.stock ?? 0;
  }
  return product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
};

export const isVariantInStock = (product, size, color) =>
  getVariantStock(product, size, color) > 0;

export const isProductOutOfStock = (product) =>
  getTotalStock(product) === 0;

/* ═══════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════ */
export function InventoryProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = useAuth();
  const userId = auth?.user?.id ?? null;

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
     MUTATIONS — optimistic where safe, reload where reliability matters
     ═══════════════════════════════════════════════════════════ */

  /* Update total stock for a single-variant product (no sizes/colors). */
  const updateStock = async (id, stock) => {
    const prev = products;
    const safe = Math.max(0, stock);
    setProducts(list => list.map(p =>
      p.id === id ? { ...p, stock: safe } : p
    ));
    try {
      await inventoryService.updateStock(id, safe);
      await reload();
    } catch (err) {
      console.error('[Inventory] updateStock failed:', err);
      setProducts(prev);
      throw err;
    }
  };

  /* Set a specific variant's stock to a number. Backend returns full product. */
  const updateVariantStock = async (productId, size, color, newStock) => {
    try {
      const updatedDto = await inventoryService.setVariantStock(productId, size, color, newStock);
      if (updatedDto) {
        /* Backend returns updated ProductDto — normalise via the same list mapper */
        const normalized = (await inventoryService.getById(productId));
        if (normalized) {
          setProducts(list => list.map(p => p.id === productId ? normalized : p));
        }
      }
      /* Also reload to be safe */
      await reload();
    } catch (err) {
      console.error('[Inventory] setVariantStock failed:', err);
      throw err;
    }
  };

  const deductVariantStock = async (productId, size, color, qty) => {
    try {
      await inventoryService.deductVariantStock(productId, size, color, qty);
      await reload();
    } catch (err) {
      console.error('[Inventory] deductVariantStock failed:', err);
      throw err;
    }
  };

  const restoreVariantStock = async (productId, size, color, qty) => {
    try {
      await inventoryService.restoreVariantStock(productId, size, color, qty);
      await reload();
    } catch (err) {
      console.error('[Inventory] restoreVariantStock failed:', err);
      throw err;
    }
  };

  /* Add product — sends new variant shape to backend, then reloads. */
  const addProduct = async (product) => {
    const body = {
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
      /* variants now an ARRAY of { size, color, stock, imageUrl } */
      variants: Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.map(v => ({
            size: v.size || null,
            color: v.color || null,
            stock: Number(v.stock) || 0,
            imageUrl: v.imageUrl || null,
          }))
        : null,
      totalStock: product.stock ?? 0,
    };
    const created = await inventoryService.create(body);
    await reload();
    return created;
  };

  const updateProduct = async (id, patch) => {
    const { image, stock, category, variants, ...rest } = patch;
    const body = { ...rest };
    if (image !== undefined) body.imageUrl = image;
    if (stock !== undefined) body.totalStock = stock;
    if (variants !== undefined && Array.isArray(variants)) {
      body.variants = variants;
    }
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

  /* ═══ Derived stats ═══ */

  const lowStock = useMemo(() => products.filter(p => {
    const total = getTotalStock(p);
    return total > 0 && total <= 10;
  }), [products]);

  const outOfStock = useMemo(
    () => products.filter(p => getTotalStock(p) === 0),
    [products]
  );

  /* Sold-out variants — one entry per product×size×color with 0 stock. */
  const soldOutVariants = useMemo(() => {
    const list = [];
    for (const p of products) {
      if (!Array.isArray(p.variants) || p.variants.length === 0) {
        if ((p.stock ?? 0) === 0) {
          list.push({
            productId: p.id,
            name: p.name,
            image: p.image,
            size: null,
            color: null,
          });
        }
        continue;
      }
      for (const v of p.variants) {
        if ((v?.stock ?? 0) === 0) {
          list.push({
            productId: p.id,
            name: p.name,
            image: p.image,
            size: v.size || null,
            color: v.color || null,
          });
        }
      }
    }
    return list;
  }, [products]);

  const productsWithSoldOutVariants = useMemo(() => {
    return products.filter(p => {
      if (!Array.isArray(p.variants) || p.variants.length === 0) {
        return (p.stock ?? 0) === 0;
      }
      return p.variants.some(v => (v?.stock ?? 0) === 0);
    });
  }, [products]);

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
      soldOutVariants,
      productsWithSoldOutVariants,
      totalValue,
      /* Extra helpers exposed for consumers */
      findVariant,
      getVariantStock,
      getVariantImage,
      getColorImage,
      getTotalStock,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}