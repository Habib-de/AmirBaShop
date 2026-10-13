import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ExtrasContext = createContext();
export const useExtras = () => useContext(ExtrasContext);

/* ═══════════════════════════════════════════════════════════
   STORAGE KEYS
   ═══════════════════════════════════════════════════════════ */
const COUPONS_KEY       = 'amir_coupons';
const RETURNS_KEY       = 'amir_returns';
const NOTIFS_KEY        = 'amir_notifications';
const APPLIED_KEY       = 'amir_applied_coupon';
const STOCK_ALERTS_KEY  = 'amir_stock_alerts';   // 👈 NEW

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
   SIZE GUIDE — static data
   ═══════════════════════════════════════════════════════════ */
const SIZE_GUIDE = {
  clothing: {
    label: 'Clothing',
    icon: '👕',
    columns: ['Age', 'Height (cm)', 'Weight (kg)', 'Size'],
    rows: [
      ['0–3 months',  '50–60',   '3–6',    '0-3M'],
      ['3–6 months',  '60–68',   '6–8',    '3-6M'],
      ['6–12 months', '68–76',   '8–10',   '6-12M'],
      ['12–18 months','76–82',   '10–11',  '12-18M'],
      ['18–24 months','82–88',   '11–12',  '18-24M'],
      ['2–3 years',   '88–96',   '12–14',  '2-3Y'],
    ],
    tips: 'When in doubt, size up — babies grow fast!',
  },
  shoes: {
    label: 'Shoes',
    icon: '👟',
    columns: ['Age', 'Foot length (cm)', 'EU', 'UK', 'US'],
    rows: [
      ['0–3 months',  '8–9',    '16', '0',   '1'],
      ['3–6 months',  '9–10',   '17', '1',   '2'],
      ['6–12 months', '10–11',  '18', '2',   '3'],
      ['12–18 months','11–12',  '19-20', '3-4', '4-5'],
      ['18–24 months','12–13',  '21-22', '4-5', '5-6'],
      ['2–3 years',   '13–14',  '23-24', '6-7', '7-8'],
    ],
    tips: 'Measure your baby\'s foot while standing for the best fit.',
  },
  hats: {
    label: 'Hats & Caps',
    icon: '🧢',
    columns: ['Age', 'Head circumference (cm)', 'Size'],
    rows: [
      ['0–3 months',  '35–40',  'XS'],
      ['3–6 months',  '40–44',  'S'],
      ['6–12 months', '44–46',  'M'],
      ['12–24 months','46–48',  'L'],
      ['2–3 years',   '48–50',  'XL'],
    ],
    tips: 'A well-fitted hat should sit just above the eyebrows.',
  },
};

/* ═══════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════ */
export function ExtrasProvider({ children }) {
  const { user } = useAuth();

  /* ─── COUPONS ─── */
  const [coupons, setCoupons] = useState(() =>
    safeParse(localStorage.getItem(COUPONS_KEY), [])
  );

  /* ─── RETURNS ─── */
  const [returns, setReturns] = useState(() =>
    safeParse(localStorage.getItem(RETURNS_KEY), [])
  );

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

  /* ─── Persist ─── */
  useEffect(() => { localStorage.setItem(COUPONS_KEY, JSON.stringify(coupons)); }, [coupons]);
  useEffect(() => { localStorage.setItem(RETURNS_KEY, JSON.stringify(returns)); }, [returns]);
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
  const addCoupon = (coupon) => {
    const code = (coupon.code || '').trim().toUpperCase();
    if (!code) return { ok: false, error: 'Code is required' };
    if (coupons.some(c => c.code === code)) {
      return { ok: false, error: 'A coupon with this code already exists' };
    }
    const newCoupon = {
      id: `CP-${Date.now().toString().slice(-6)}`,
      code,
      type: coupon.type || 'percent',
      value: Number(coupon.value) || 0,
      minOrder: Number(coupon.minOrder) || 0,
      maxUses: Number(coupon.maxUses) || 0,
      uses: 0,
      expiresAt: coupon.expiresAt || null,
      active: coupon.active !== false,
      createdAt: new Date().toISOString(),
    };
    setCoupons(prev => [newCoupon, ...prev]);
    return { ok: true, coupon: newCoupon };
  };

  const updateCoupon = (id, patch) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const deleteCoupon = (id) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    if (appliedCoupon?.id === id) setAppliedCoupon(null);
  };

  const validateCoupon = (code, subtotal) => {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) return { ok: false, error: 'Enter a code' };

    const coupon = coupons.find(c => c.code === clean);
    if (!coupon) return { ok: false, error: 'Invalid code' };
    if (!coupon.active) return { ok: false, error: 'This coupon is no longer active' };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { ok: false, error: 'This coupon has expired' };
    }
    if (coupon.maxUses > 0 && coupon.uses >= coupon.maxUses) {
      return { ok: false, error: 'This coupon has reached its usage limit' };
    }
    if (subtotal < coupon.minOrder) {
      return { ok: false, error: `Minimum order of KES ${coupon.minOrder} required` };
    }

    let discount = 0;
    if (coupon.type === 'percent') {
      discount = Math.round((subtotal * coupon.value) / 100);
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, subtotal);
    } else if (coupon.type === 'freeship') {
      discount = 0;
    }

    return { ok: true, coupon, discount };
  };

  const applyCoupon = (code, subtotal) => {
    const res = validateCoupon(code, subtotal);
    if (!res.ok) return res;
    setAppliedCoupon({
      id: res.coupon.id,
      code: res.coupon.code,
      type: res.coupon.type,
      value: res.coupon.value,
      discount: res.discount,
    });
    return res;
  };

  const removeCoupon = () => setAppliedCoupon(null);

  const incrementCouponUse = (code) => {
    if (!code) return;
    const clean = code.trim().toUpperCase();
    setCoupons(prev => prev.map(c =>
      c.code === clean ? { ...c, uses: (c.uses || 0) + 1 } : c
    ));
  };

  const couponDiscount = appliedCoupon?.discount || 0;
  const couponIsFreeShip = appliedCoupon?.type === 'freeship';

  /* ═══════════════════════════════════════════════════════════
     📦 RETURNS
     ═══════════════════════════════════════════════════════════ */
  const requestReturn = ({ order, items, reason, note, user: reqUser }) => {
    const entry = {
      id: `RT-${Date.now().toString().slice(-6)}`,
      orderId: order.id,
      customerEmail: (order.customer?.email || reqUser?.email || '').toLowerCase(),
      customerName: order.customer?.name || reqUser?.name || 'Guest',
      items: items.map(i => ({
        id: i.id, key: i.key, name: i.name, image: i.image,
        qty: i.qty, price: i.price, size: i.size, color: i.color,
      })),
      reason: reason || 'Other',
      note: (note || '').trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setReturns(prev => [entry, ...prev]);
    return entry;
  };

  const updateReturnStatus = (id, status, extra = {}) => {
  setReturns(prev => prev.map(r =>
    r.id === id
      ? {
          ...r,
          status,
          // 🆕 Clear rejection reason if status is no longer 'rejected'
          ...(status !== 'rejected' ? { rejectionReason: null } : {}),
          ...extra,
          updatedAt: new Date().toISOString(),
        }
      : r
  ));
};

  const approveReturn  = (id) => updateReturnStatus(id, 'approved');
const completeReturn = (id) => updateReturnStatus(id, 'completed');

// 🆕 rejectReturn now accepts an optional reason
const rejectReturn = (id, reason = '') => {
  updateReturnStatus(id, 'rejected', {
    rejectionReason: (reason || '').trim() || 'No reason provided',
  });
};

  const getMyReturns = (email) => {
    if (!email) return [];
    const target = email.toLowerCase();
    return returns.filter(r => r.customerEmail === target);
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
     🔔 NOTIFICATIONS
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
     🔔 STOCK ALERTS (back-in-stock)
     ═══════════════════════════════════════════════════════════ */

  /* Customer subscribes to be notified when a variant is back */
  const subscribeToStock = ({ productId, productName, size, color, email }) => {
    if (!email) return { ok: false, error: 'Email required' };
    const cleanEmail = email.trim().toLowerCase();

    // Prevent duplicates
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

  /* Count pending subscribers for a variant (for owner view) */
  const getSubscribersForVariant = (productId, size, color) => {
    return stockAlerts.filter(a =>
      a.productId === productId &&
      a.size === (size || null) &&
      a.color === (color || null) &&
      !a.notifiedAt
    ).length;
  };

  /* When stock is restored, fire notifications for that variant */
  const notifyStockRestored = (productId, size, color, productName) => {
    const matching = stockAlerts.filter(a =>
      a.productId === productId &&
      a.size === (size || null) &&
      a.color === (color || null) &&
      !a.notifiedAt
    );
    if (matching.length === 0) return 0;

    // Push notification to each subscriber
    matching.forEach(a => {
      notify(a.email, {
        type: 'info',
        title: `Back in stock: ${productName}`,
        body: `${[size, color].filter(Boolean).join(' · ') || 'This item'} is available again. Order now!`,
        link: `/product/${productId}`,
      });
    });

    // Mark them as notified
    const ids = new Set(matching.map(m => m.id));
    setStockAlerts(prev => prev.map(a =>
      ids.has(a.id) ? { ...a, notifiedAt: new Date().toISOString() } : a
    ));

    return matching.length;
  };

  /* Owner: see all pending (unnotified) alerts */
  const getPendingAlerts = () =>
    stockAlerts.filter(a => !a.notifiedAt);

  /* ═══════════════════════════════════════════════════════════
     CONTEXT VALUE
     ═══════════════════════════════════════════════════════════ */
  return (
    <ExtrasContext.Provider value={{
      /* 🎟️ Coupons */
      coupons, addCoupon, updateCoupon, deleteCoupon,
      validateCoupon, appliedCoupon, applyCoupon, removeCoupon,
      couponDiscount, couponIsFreeShip, incrementCouponUse,

      /* 📦 Returns */
      returns, returnCounts,
      requestReturn, approveReturn, rejectReturn, completeReturn,
      getMyReturns, getReturnById,

      /* 📏 Size Guide (static) */
      sizeGuide: SIZE_GUIDE,

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