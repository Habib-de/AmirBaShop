import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { wishlistService } from '../services/api';

const WishlistContext = createContext();
export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }) {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ─── Load on user change ─── */
  const load = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    try {
      const list = await wishlistService.list();
      setItems(list);
    } catch (err) {
      console.warn('[Wishlist] load failed:', err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /* ─── ADD ─── */
  const addItem = useCallback(async (product) => {
    if (!user) return false;
    try {
      await wishlistService.add(product.id);
      await load();
      return true;
    } catch (err) {
      console.warn('[Wishlist] add failed:', err.message);
      return false;
    }
  }, [user, load]);

  /* ─── REMOVE ─── */
  const removeItem = useCallback(async (id) => {
    if (!user) return;
    // optimistic
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await wishlistService.remove(id);
    } catch (err) {
      console.warn('[Wishlist] remove failed:', err.message);
      load(); // re-sync on failure
    }
  }, [user, load]);

  /* ─── TOGGLE ─── */
  const toggleItem = useCallback(async (product) => {
    if (!user) return false;
    const exists = items.some(i => i.id === product.id);
    if (exists) {
      await removeItem(product.id);
      return false;
    }
    await addItem(product);
    return true;
  }, [user, items, addItem, removeItem]);

  /* ─── CHECK ─── */
  const isInWishlist = useCallback(
    (id) => items.some(i => i.id === id),
    [items]
  );

  /* ─── CLEAR ─── */
  const clearWishlist = useCallback(async () => {
    if (!user) return;
    setItems([]);
    try {
      await wishlistService.clear();
    } catch (err) {
      console.warn('[Wishlist] clear failed:', err.message);
      load();
    }
  }, [user, load]);

  const count = items.length;

  return (
    <WishlistContext.Provider value={{
      items,
      loading,
      addItem,
      removeItem,
      toggleItem,
      isInWishlist,
      clearWishlist,
      count,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}