import { createContext, useContext, useEffect, useState } from 'react';

const OrderContext = createContext();
export const useOrders = () => useContext(OrderContext);

const STORAGE_KEY = 'amir_orders';

export const ORDER_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
};

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  // Bumping this triggers re-renders when seen timestamps change
  const [, setLastSeenKey] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const createOrder = (payload) => {
    const order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: ORDER_STATUS.PENDING,
      ...payload,
    };
    setOrders(prev => [order, ...prev]);
    return order;
  };

  const updateStatus = (id, status) => {
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
    ));
  };

  const confirmOrder = (id) => updateStatus(id, ORDER_STATUS.CONFIRMED);
  const fulfillOrder = (id) => updateStatus(id, ORDER_STATUS.FULFILLED);
  const cancelOrder  = (id) => updateStatus(id, ORDER_STATUS.CANCELLED);

  const updateOrder = (id, patch) => {
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o
    ));
  };

  const deleteOrder = (id) => setOrders(prev => prev.filter(o => o.id !== id));

  const findByCustomer = (email) =>
    orders.filter(o => o.customer?.email?.toLowerCase() === email?.toLowerCase());

  /* ── Seen/unseen tracking for customer notifications ── */
  const markOrdersSeen = (email) => {
    if (!email) return;
    try {
      localStorage.setItem(
        `amir_orders_seen_${email.toLowerCase()}`,
        new Date().toISOString()
      );
      setLastSeenKey(k => k + 1);
    } catch {}
  };

  const getUnseenCount = (email) => {
    if (!email) return 0;
    try {
      const lastSeen = localStorage.getItem(`amir_orders_seen_${email.toLowerCase()}`);
      const mine = findByCustomer(email);
      if (!lastSeen) return mine.length;
      const lastSeenTime = new Date(lastSeen).getTime();
      return mine.filter(o => {
        const updated = new Date(o.updatedAt || o.createdAt).getTime();
        return updated > lastSeenTime;
      }).length;
    } catch {
      return 0;
    }
  };

  const counts = {
    pending:   orders.filter(o => o.status === ORDER_STATUS.PENDING).length,
    confirmed: orders.filter(o => o.status === ORDER_STATUS.CONFIRMED).length,
    fulfilled: orders.filter(o => o.status === ORDER_STATUS.FULFILLED).length,
    cancelled: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length,
    total:     orders.length,
  };

  const revenue = orders
    .filter(o => o.status === ORDER_STATUS.FULFILLED)
    .reduce((s, o) => s + (o.total || 0), 0);

  return (
    <OrderContext.Provider value={{
      orders,
      createOrder,
      updateStatus,
      updateOrder,
      confirmOrder,
      fulfillOrder,
      cancelOrder,
      deleteOrder,
      findByCustomer,
      markOrdersSeen,
      getUnseenCount,
      counts,
      revenue,
    }}>
      {children}
    </OrderContext.Provider>
  );
}