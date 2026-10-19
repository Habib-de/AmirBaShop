import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { couponService, returnService } from '../services/api';
import { SIZE_GUIDES } from '../data/sizeGuides';

const ExtrasContext = createContext();
export const useExtras = () => useContext(ExtrasContext);

/* ═══════════════════════════════════════════════════════════
   STORAGE KEYS
   ═══════════════════════════════════════════════════════════ */
const RETURNS_KEY       = 'amir_returns';
const NOTIFS_KEY        = 'amir_notifications';
const APPLIED_KEY       = 'amir_applied_coupon';
const STOCK_ALERTS_KEY  = 'amir_stock_alerts';

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const safeParse = (raw, fallback) => {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch { return fallback; }
};

const userKey = (base, user) => {
  if (!user) return `${base}_guest`;
  return `${base}_${user.email?.toLowerCase() || user.id}`;
};

/* ═══════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════ */
export function ExtrasProvider({ children }) {

  const { user, isStaff } = useAuth();

  /* ─── COUPONS (server-backed) ─── */
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);

    /* ─── RETURNS (server-backed) ─── */
  const [returns, setReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);


  /* ─── NOTIFICATIONS ─── */
  const [notifications, setNotifications] = useState(() =>
    safeParse(localStorage.getItem(NOTIFS_KEY), [])
  );

  /* ─── STOCK ALERTS ─── */
  const [stockAlerts, setStockAlerts] = useState(() =>
    safeParse(localStorage.getItem(STOCK_ALERTS_KEY), [])
  );

  /* ─── APPLIED COUPON (per user) ─── */
  const appliedKey = userKey(APPLIED_KEY, user);
  const [appliedCoupon, setAppliedCoupon] = useState(() =>
    safeParse(localStorage.getItem(appliedKey), null)
  );

  /* ─── Load coupons from backend (owner only) ─── */
  const loadCoupons = useCallback(async () => {
    if (!user || user.role !== 'owner') {
      setCoupons([]);
      return;
    }
    setCouponsLoading(true);
    try {
      const list = await couponService.list();
      setCoupons(list);
    } catch (err) {
      console.warn('[Coupons] load failed:', err.message);
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  /* ─── Persist ─── */
  useEffect(() => { localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem(STOCK_ALERTS_KEY, JSON.stringify(stockAlerts)); }, [stockAlerts]);

  useEffect(() => {
    setAppliedCoupon(safeParse(localStorage.getItem(appliedKey), null));
  }, [appliedKey]);

  useEffect(() => {
    if (appliedCoupon) localStorage.setItem(appliedKey, JSON.stringify(appliedCoupon));
    else localStorage.removeItem(appliedKey);
  }, [appliedCoupon, appliedKey]);

  /* ═══════════════════════════════════════════════════════════
     🎟️ COUPONS
     ═══════════════════════════════════════════════════════════ */

  const addCoupon = async (data) => {
    const code = (data.code || '').trim().toUpperCase();
    if (!code) return { ok: false, error: 'Code is required' };
    if (coupons.some(c => c.code === code)) {
      return { ok: false, error: 'A coupon with this code already exists' };
    }

    try {
      const created = await couponService.create({ ...data, code });
      setCoupons(prev => [created, ...prev]);
      return { ok: true, coupon: created };
    } catch (err) {
      return { ok: false, error: err.message || 'Failed to create coupon' };
    }
  };

  const updateCoupon = async (id, patch) => {
    try {
      const updated = await couponService.update(id, patch);
      setCoupons(prev => prev.map(c => c.id === id ? updated : c));
      return { ok: true, coupon: updated };
    } catch (err) {
      return { ok: false, error: err.message || 'Failed to update coupon' };
    }
  };

  const deleteCoupon = async (id) => {
    try {
      await couponService.remove(id);
      setCoupons(prev => prev.filter(c => c.id !== id));
      if (appliedCoupon?.code && appliedCoupon.code === coupons.find(c => c.id === id)?.code) {
        setAppliedCoupon(null);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Failed to delete coupon' };
    }
  };

  /**
   * Validate via backend. Returns:
   *   { ok: true, coupon: { code, type, discount }, discount }
   *   { ok: false, error: 'message' }
   */
  const applyCoupon = async (code, subtotal) => {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) return { ok: false, error: 'Enter a code' };

    try {
      const res = await couponService.validate(clean, subtotal, user?.tenantId);
      if (!res.valid) {
        return { ok: false, error: res.message || 'Invalid coupon' };
      }
      setAppliedCoupon({
        code: res.code,
        type: res.type,
        discount: Number(res.discount) || 0,
      });
      return {
        ok: true,
        coupon: { code: res.code, type: res.type, discount: Number(res.discount) || 0 },
        discount: Number(res.discount) || 0,
      };
    } catch (err) {
      return { ok: false, error: err.message || 'Could not validate coupon' };
    }
  };

  const removeCoupon = () => setAppliedCoupon(null);

  const couponDiscount = appliedCoupon?.discount || 0;
  const couponIsFreeShip = appliedCoupon?.type === 'freeship';

    /* ═══════════════════════════════════════════════════════════
     📦 RETURNS (server-backed)
     ═══════════════════════════════════════════════════════════ */

  const loadReturns = useCallback(async () => {
    if (!user) {
      setReturns([]);
      return;
    }
    setReturnsLoading(true);
    try {
      const list = isStaff ? await returnService.listAll() : await returnService.listMine();
      setReturns(list);
    } catch (err) {
      console.warn('[Returns] load failed:', err.message);
      setReturns([]);
    } finally {
      setReturnsLoading(false);
    }
  }, [user, isStaff]);

  useEffect(() => { loadReturns(); }, [loadReturns]);

  const requestReturn = async ({ order, items, reason, note, user: reqUser }) => {
    try {
      const newReturn = await returnService.create({
        orderId: order.id,
        reason: reason || 'Other',
        note: note || '',
        items: items.map(i => ({
          id: i.id, name: i.name, image: i.image, qty: i.qty, price: i.price
        })),
      });
      setReturns(prev => [newReturn, ...prev]);
      return { ok: true, return: newReturn };
    } catch (err) {
      return { ok: false, error: err.message || 'Failed to request return' };
    }
  };

  const approveReturn = async (id) => {
    try {
      const updated = await returnService.updateStatus(id, 'approved');
      setReturns(prev => prev.map(r => r.id === id ? updated : r));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const rejectReturn = async (id, reason = '') => {
    try {
      const updated = await returnService.updateStatus(id, 'rejected', reason || 'No reason provided');
      setReturns(prev => prev.map(r => r.id === id ? updated : r));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const completeReturn = async (id) => {
    try {
      const updated = await returnService.updateStatus(id, 'completed');
      setReturns(prev => prev.map(r => r.id === id ? updated : r));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const getMyReturns = (email) => {
    if (!email) return [];
    return returns.filter(r => r.customerEmail?.toLowerCase() === email.toLowerCase());
  };

  const getReturnById = (id) => returns.find(r => r.id === id) || null;

  const returnCounts = useMemo(() => ({
    total:     returns.length,
    pending:   returns.filter(r => r.status === 'pending').length,
    approved:  returns.filter(r => r.status === 'approved').length,
    rejected:  returns.filter(r => r.status === 'rejected').length,
    completed: returns.filter(r => r.status === 'completed').length,
  }), [returns]);

  /* ═══════════════════════════════════════════════════════════
     🔔 NOTIFICATIONS — unchanged
     ═══════════════════════════════════════════════════════════ */
  const notify = useCallback((email, { type = 'info', title, body, link }) => {
    if (!email) return null;
    const notif = {
      id: `NT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
      userEmail: email.toLowerCase(),
      type,
      title: (title || '').trim(),
      body: (body || '').trim(),
      link: link || null,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [notif, ...prev]);
    return notif;
  }, []);

  const markNotifRead = (id) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const markAllNotifsRead = (email) => {
    if (!email) return;
    const target = email.toLowerCase();
    setNotifications(prev => prev.map(n =>
      n.userEmail === target ? { ...n, read: true } : n
    ));
  };

  const clearNotifs = (email) => {
    if (!email) return;
    const target = email.toLowerCase();
    setNotifications(prev => prev.filter(n => n.userEmail !== target));
  };

  const getMyNotifs = (email) => {
    if (!email) return [];
    const target = email.toLowerCase();
    return notifications
      .filter(n => n.userEmail === target)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getUnreadNotifCount = (email) => {
    if (!email) return 0;
    const target = email.toLowerCase();
    return notifications.filter(n => n.userEmail === target && !n.read).length;
  };

  /* ═══════════════════════════════════════════════════════════
     🔔 STOCK ALERTS — unchanged
     ═══════════════════════════════════════════════════════════ */
  const subscribeToStock = ({ productId, productName, size, color, email }) => {
    if (!email) return { ok: false, error: 'Email required' };
    const cleanEmail = email.trim().toLowerCase();

    const exists = stockAlerts.some(a =>
      a.productId === productId &&
      a.size === (size || null) &&
      a.color === (color || null) &&
      a.email === cleanEmail &&
      !a.notifiedAt
    );
    if (exists) {
      return { ok: false, error: 'You\'re already subscribed for this variant' };
    }

    const alert = {
      id: `SA-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
      productId,
      productName,
      size: size || null,
      color: color || null,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
      notifiedAt: null,
    };
    setStockAlerts(prev => [alert, ...prev]);
    return { ok: true, alert };
  };

  const getSubscribersForVariant = (productId, size, color) => {
    return stockAlerts.filter(a =>
      a.productId === productId &&
      a.size === (size || null) &&
      a.color === (color || null) &&
      !a.notifiedAt
    ).length;
  };

  const notifyStockRestored = (productId, size, color, productName) => {
    const matching = stockAlerts.filter(a =>
      a.productId === productId &&
      a.size === (size || null) &&
      a.color === (color || null) &&
      !a.notifiedAt
    );
    if (matching.length === 0) return 0;

    matching.forEach(a => {
      notify(a.email, {
        type: 'info',
        title: `Back in stock: ${productName}`,
        body: `${[size, color].filter(Boolean).join(' · ') || 'This item'} is available again. Order now!`,
        link: `/product/${productId}`,
      });
    });

    const ids = new Set(matching.map(m => m.id));
    setStockAlerts(prev => prev.map(a =>
      ids.has(a.id) ? { ...a, notifiedAt: new Date().toISOString() } : a
    ));

    return matching.length;
  };

  const getPendingAlerts = () =>
    stockAlerts.filter(a => !a.notifiedAt);

  /* ═══════════════════════════════════════════════════════════
     CONTEXT VALUE
     ═══════════════════════════════════════════════════════════ */
  return (
    <ExtrasContext.Provider value={{
      /* 🎟️ Coupons */
      coupons, couponsLoading, reloadCoupons: loadCoupons,
      addCoupon, updateCoupon, deleteCoupon,
      appliedCoupon, applyCoupon, removeCoupon,
      couponDiscount, couponIsFreeShip,

            /* 📦 Returns */
      returns, returnsLoading, returnCounts,
      requestReturn, approveReturn, rejectReturn, completeReturn,
      getMyReturns, getReturnById,

      /* 📏 Size Guide (static, from data file) */
      sizeGuide: SIZE_GUIDES,

      /* 🔔 Notifications */
      notifications, notify,
      markNotifRead, markAllNotifsRead, clearNotifs,
      getMyNotifs, getUnreadNotifCount,

      /* 🔔 Stock Alerts */
      stockAlerts,
      subscribeToStock,
      getSubscribersForVariant,
      notifyStockRestored,
      getPendingAlerts,
    }}>
      {children}
    </ExtrasContext.Provider>
  );
}