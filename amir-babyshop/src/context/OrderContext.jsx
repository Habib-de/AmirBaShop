import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { orderService } from '../services/api';
import { useAuth } from './AuthContext';
import { buildCheckpoint } from '../utils/carrierHelpers';

const OrderContext = createContext();
export const useOrders = () => useContext(OrderContext);

export const ORDER_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
};

export function OrderProvider({ children }) {
  const { user, isStaff } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setLastSeenKey] = useState(0);

  /* ═══════════════════════════════════════════════════════════
     LOAD — staff → all tenant orders, customer → my orders
     ═══════════════════════════════════════════════════════════ */
  const reload = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const list = isStaff
        ? await orderService.listAll()
        : await orderService.listMine();
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('[Orders] load failed:', err);
      setError(err?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user, isStaff]);

  useEffect(() => { reload(); }, [reload]);

  /* ═══════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════ */
  const replaceOrder = (updated) => {
    if (!updated) return;
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  };

  /* ═══════════════════════════════════════════════════════════
     CONFIRM — status → confirmed + attach carrier/tracking
     ═══════════════════════════════════════════════════════════ */
  const confirmOrder = async (id, trackingData = null) => {
    try {
      /* 1. Flip status on backend */
      const confirmed = await orderService.confirm(id);

      /* 2. If we have tracking info, persist it + add first checkpoint */
      if (trackingData) {
        const checkpoint = buildCheckpoint('confirmed');
        const patch = {
          carrierId:      trackingData.carrierId,
          carrierName:    trackingData.carrierName,
          trackingNumber: trackingData.trackingNumber,
          eta:            trackingData.eta,
        };
        const withTracking = await orderService.update(id, patch).catch(err => {
          console.warn('[Orders] tracking patch failed:', err);
          return null;
        });

        /* 3. Add the "confirmed" checkpoint */
        await orderService.addCheckpoint(id, checkpoint).catch(err => {
          console.warn('[Orders] checkpoint patch failed:', err);
        });

        /* 4. Merge local view so UI shows everything without waiting for reload */
        replaceOrder({
          ...(withTracking || confirmed),
          carrier:        trackingData.carrierId,
          carrierName:    trackingData.carrierName,
          trackingNumber: trackingData.trackingNumber,
          eta:            trackingData.eta,
          checkpoints: [
            ...((withTracking || confirmed)?.checkpoints || []),
            checkpoint,
          ],
        });
      } else {
        replaceOrder(confirmed);
      }
    } catch (err) {
      console.error('[Orders] confirm failed:', err);
      throw err;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     FULFILL
     ═══════════════════════════════════════════════════════════ */
  const fulfillOrder = async (id) => {
    try {
      const updated = await orderService.fulfill(id);
      replaceOrder(updated);
    } catch (err) {
      console.error('[Orders] fulfill failed:', err);
      throw err;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     CANCEL
     ═══════════════════════════════════════════════════════════ */
  const cancelOrder = async (id) => {
    try {
      const updated = await orderService.cancel(id);
      replaceOrder(updated);
    } catch (err) {
      console.error('[Orders] cancel failed:', err);
      throw err;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     UPDATE (generic — used by Edit Order modal + tracking)
     ═══════════════════════════════════════════════════════════ */
  const updateOrder = async (id, patch) => {
    const prev = orders;
    /* Optimistic */
    setOrders(prevList => prevList.map(o =>
      o.id === id ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o
    ));
    try {
      const updated = await orderService.update(id, patch);
      if (updated) replaceOrder(updated);
    } catch (err) {
      console.error('[Orders] update failed:', err);
      setOrders(prev);   // rollback
      throw err;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     DELETE
     ═══════════════════════════════════════════════════════════ */
  const deleteOrder = async (id) => {
    const prev = orders;
    setOrders(prevList => prevList.filter(o => o.id !== id));
    try {
      await orderService.remove(id);
    } catch (err) {
      console.error('[Orders] delete failed:', err);
      setOrders(prev);   // rollback
      throw err;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ADD CHECKPOINT (tracking stage advance)
     ═══════════════════════════════════════════════════════════ */
  const addCheckpoint = async (orderId, type, customNote = '') => {
    const checkpoint = buildCheckpoint(type, customNote);

    /* Optimistic */
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? {
            ...o,
            checkpoints: [...(o.checkpoints || []), checkpoint],
            updatedAt: new Date().toISOString(),
          }
        : o
    ));

    try {
      await orderService.addCheckpoint(orderId, checkpoint);
    } catch (err) {
      console.warn('[Orders] addCheckpoint failed:', err);
      /* Rollback */
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, checkpoints: (o.checkpoints || []).filter(c => c !== checkpoint) }
          : o
      ));
    }

    return checkpoint;
  };

  /* ═══════════════════════════════════════════════════════════
     QUERIES
     ═══════════════════════════════════════════════════════════ */
  const findByTracking = (trackingNumber) => {
    if (!trackingNumber) return null;
    const clean = trackingNumber.trim().toUpperCase();
    return orders.find(o => o.trackingNumber?.toUpperCase() === clean) || null;
  };

  const findById = (orderId) => {
    if (!orderId) return null;
    const clean = orderId.trim().toUpperCase();
    return orders.find(o => o.id?.toUpperCase() === clean) || null;
  };

  const findByCustomer = (email) => {
    if (!email) return [];
    return orders.filter(o =>
      o.customer?.email?.toLowerCase() === email.toLowerCase()
    );
  };

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

  /* ═══════════════════════════════════════════════════════════
     COUNTS + REVENUE (derived from server data)
     ═══════════════════════════════════════════════════════════ */
  const counts = {
    pending:   orders.filter(o => o.status === ORDER_STATUS.PENDING).length,
    confirmed: orders.filter(o => o.status === ORDER_STATUS.CONFIRMED).length,
    fulfilled: orders.filter(o => o.status === ORDER_STATUS.FULFILLED).length,
    cancelled: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length,
    total:     orders.length,
  };

  const revenue = orders
    .filter(o => o.status === ORDER_STATUS.FULFILLED)
    .reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <OrderContext.Provider value={{
      orders,
      loading,
      error,
      reload,
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