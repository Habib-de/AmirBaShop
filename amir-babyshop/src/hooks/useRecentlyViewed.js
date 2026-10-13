import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';

const MAX_ITEMS = 8;

/* ─── Per-user key, same pattern as cart/wishlist ─── */
const getKey = (user) => {
  if (!user) return 'amir_recently_viewed_guest';
  return `amir_recently_viewed_${user.email?.toLowerCase() || user.id}`;
};

/* ─── Read raw IDs from localStorage ─── */
const readIds = (key) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

/* ─── Write raw IDs ─── */
const writeIds = (key, ids) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {}
};

/**
 * useRecentlyViewed
 * @returns {{
 *   items: object[],      // hydrated products, newest first
 *   record: (product) => void,
 *   clear: () => void,
 *   count: number,
 * }}
 */
export function useRecentlyViewed() {
  const { user } = useAuth();
  const { products } = useInventory();
  const key = getKey(user);

  // Raw list of product IDs (newest first)
  const [ids, setIds] = useState(() => readIds(key));

  // When the user changes, load THAT user's history
  useEffect(() => {
    setIds(readIds(key));
  }, [key]);

  /* ─── Record a product view ─── */
  const record = useCallback((product) => {
    if (!product?.id) return;
    setIds(prev => {
      const next = [product.id, ...prev.filter(id => id !== product.id)].slice(0, MAX_ITEMS);
      writeIds(key, next);
      return next;
    });
  }, [key]);

  /* ─── Clear history ─── */
  const clear = useCallback(() => {
    writeIds(key, []);
    setIds([]);
  }, [key]);

  /* ─── Hydrate IDs → real products (skip deleted ones) ─── */
  const items = useMemo(() => {
    if (!ids.length) return [];
    const byId = new Map(products.map(p => [p.id, p]));
    return ids.map(id => byId.get(id)).filter(Boolean);
  }, [ids, products]);

  /* ─── If some IDs point to deleted products, clean up storage ─── */
  useEffect(() => {
    if (!ids.length) return;
    const validIds = ids.filter(id => products.some(p => p.id === id));
    if (validIds.length !== ids.length) {
      writeIds(key, validIds);
      setIds(validIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  return {
    items,
    record,
    clear,
    count: items.length,
  };
}