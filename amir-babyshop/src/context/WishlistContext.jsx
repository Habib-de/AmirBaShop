import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();
export const useWishlist = () => useContext(WishlistContext);

// Each user (or guest) gets their own wishlist key
const getWishlistKey = (user) => {
  if (!user) return 'amir_wishlist_guest';
  return `amir_wishlist_${user.email?.toLowerCase() || user.id}`;
};

export function WishlistProvider({ children }) {
  const { user } = useAuth();

  // Which user's wishlist is active
  const [items, setItems] = useState(() => {
    try {
      const key = getWishlistKey(user);
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
  });

  // When the logged-in user changes, load THAT user's wishlist
  useEffect(() => {
    try {
      const key = getWishlistKey(user);
      const saved = JSON.parse(localStorage.getItem(key));
      setItems(saved || []);
    } catch {
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Save wishlist to the CURRENT user's key
  useEffect(() => {
    try {
      const key = getWishlistKey(user);
      localStorage.setItem(key, JSON.stringify(items));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, user?.email]);

  /* ─── ADD ─── */
  const addItem = (product) => {
    setItems(prev => {
      if (prev.some(i => i.id === product.id)) return prev; // already saved
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        category: product.category,
        sku: product.sku,
        stock: product.stock,
        badge: product.badge,
        addedAt: new Date().toISOString(),
      }];
    });
  };

  /* ─── REMOVE ─── */
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  /* ─── TOGGLE (returns true if added, false if removed) ─── */
  const toggleItem = (product) => {
    const exists = items.some(i => i.id === product.id);
    if (exists) {
      removeItem(product.id);
      return false;
    }
    addItem(product);
    return true;
  };

  /* ─── CHECK ─── */
  const isInWishlist = (id) => items.some(i => i.id === id);

  /* ─── CLEAR ─── */
  const clearWishlist = () => setItems([]);

  const count = items.length;

  return (
    <WishlistContext.Provider value={{
      items,
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