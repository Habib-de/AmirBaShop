import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

// Each user (or guest) gets their own cart key
const getCartKey = (user) => {
  if (!user) return 'amir_cart_guest';
  return `amir_cart_${user.email?.toLowerCase() || user.id}`;
};

export function CartProvider({ children }) {
  const { user } = useAuth();

  // Which user's cart is active
  const [items, setItems] = useState(() => {
    try {
      const key = getCartKey(user);
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
  });

  // When the logged-in user changes, load THAT user's cart
  useEffect(() => {
    try {
      const key = getCartKey(user);
      const saved = JSON.parse(localStorage.getItem(key));
      setItems(saved || []);
    } catch {
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Save cart to the CURRENT user's key
  useEffect(() => {
    try {
      const key = getCartKey(user);
      localStorage.setItem(key, JSON.stringify(items));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, user?.email]);

    const addItem = (product, qty = 1, options = {}) => {
    setItems(prev => {
      const key = `${product.id}-${options.size || ''}-${options.color || ''}-${options.giftId || ''}`;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { key, ...product, qty, ...options }];
    });
  };

  const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key));

  const updateQty = (key, qty) => {
    if (qty <= 0) return removeItem(key);
    setItems(prev => prev.map(i => i.key === key ? { ...i, qty } : i));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}