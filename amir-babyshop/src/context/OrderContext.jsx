import { createContext, useContext, useEffect, useState } from 'react';
import { orderService } from '../services/api';
import { buildCheckpoint } from '../utils/carrierHelpers';

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

  const [, setLastSeenKey] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  /* ═══════════════════════════════════════════════════════════
     CREATE order
     ═══════════════════════════════════════════════════════════ */
  const createOrder = (payload) => {
    const order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: ORDER_STATUS.PENDING,
      ...payload,
      carrier: null,
      carrierName: null,
      trackingNumber: null,
      eta: null,
      checkpoints: [],
    };
    setOrders(prev => [order, ...prev]);
    return order;
  };

  /* ═══════════════════════════════════════════════════════════
     UPDATE status
     ═══════════════════════════════════════════════════════════ */
  const updateStatus = (id, status) => {
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
    ));
  };

  /* ═══════════════════════════════════════════════════════════
     CONFIRM order (with tracking info)
     ═══════════════════════════════════════════════════════════ */
  const confirmOrder = (id, trackingData = null) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;

      const updated = {
        ...o,
        status: ORDER_STATUS.CONFIRMED,
        updatedAt: new Date().toISOString(),
      };

      if (trackingData) {
        updated.carrier = trackingData.carrierId;
        updated.carrierName = trackingData.carrierName;
        updated.trackingNumber = trackingData.trackingNumber;
        updated.eta = trackingData.eta;
        updated.checkpoints = [
          ...(o.checkpoints || []),
          buildCheckpoint('confirmed'),
        ];
      }

      return updated;
    }));

    if (trackingData) {
      const updated = orders.find(o => o.id === id);
      if (updated) {
        orderService.update(id, {
          status: ORDER_STATUS.CONFIRMED,
          carrier: trackingData.carrierId,
          carrierName: trackingData.carrierName,
          trackingNumber: trackingData.trackingNumber,
          eta: trackingData.eta,
          checkpoints: [
            ...(updated.checkpoints || []),
            buildCheckpoint('confirmed'),
          ],
        }).catch(err => console.warn('[Orders] confirm failed:', err));
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     FULFILL order
     ─────────────────────────────────────────────────────────
     Simplified: only changes the status. Checkpoints are added
     by staff manually via the "next stage" button.
     ═══════════════════════════════════════════════════════════ */
  const fulfillOrder = (id) => {
    setOrders(prev => prev.map(o =>
      o.id === id
        ? { ...o, status: ORDER_STATUS.FULFILLED, updatedAt: new Date().toISOString() }
        : o
    ));

    orderService.update(id, {
      status: ORDER_STATUS.FULFILLED,
    }).catch(err => console.warn('[Orders] fulfill failed:', err));
  };

  const cancelOrder = (id) => updateStatus(id, ORDER_STATUS.CANCELLED);

  /* ═══════════════════════════════════════════════════════════
     UPDATE order (any fields)
     ═══════════════════════════════════════════════════════════ */
  const updateOrder = (id, patch) => {
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o
    ));
    orderService.update(id, patch).catch(err =>
      console.warn('[Orders] update failed:', err)
    );
  };

  const deleteOrder = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    orderService.remove(id).catch(err =>
      console.warn('[Orders] delete failed:', err)
    );
  };

  /* ═══════════════════════════════════════════════════════════
     TRACKING — add checkpoint
     ═══════════════════════════════════════════════════════════ */
  const addCheckpoint = (orderId, type, customNote = '') => {
    const checkpoint = buildCheckpoint(type, customNote);

    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? {
            ...o,
            checkpoints: [...(o.checkpoints || []), checkpoint],
            updatedAt: new Date().toISOString(),
          }
        : o
    ));

    orderService.addCheckpoint(orderId, checkpoint).catch(err =>
      console.warn('[Orders] addCheckpoint failed:', err)
    );

    return checkpoint;
  };

  const findByTracking = (trackingNumber) => {
    if (!trackingNumber) return null;
    const clean = trackingNumber.trim().toUpperCase();
    return orders.find(o =>
      o.trackingNumber?.toUpperCase() === clean
    ) || null;
  };

  const findById = (orderId) => {
    if (!orderId) return null;
    const clean = orderId.trim().toUpperCase();
    return orders.find(o => o.id?.toUpperCase() === clean) || null;
  };

  /* ═══════════════════════════════════════════════════════════
     QUERIES
     ═══════════════════════════════════════════════════════════ */
  const findByCustomer = (email) =>
    orders.filter(o => o.customer?.email?.toLowerCase() === email?.toLowerCase());

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
      addCheckpoint,
      findByTracking,
      findById,
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