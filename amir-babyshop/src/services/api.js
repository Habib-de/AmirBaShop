/* ═══════════════════════════════════════════════════════════
   API SERVICE LAYER — real backend + mocked endpoints

   ─── Real backend (Spring Boot) ───
   → auth, user, tenant, inventory, order, coupon, registry

   ─── Still mocked (localStorage) ───
   → review, currency
   → These will be migrated in Phases 4, 5, 6

   Flip any service from mock → real by changing its value
   in the MOCK_MODE object below.
   ═══════════════════════════════════════════════════════════ */

import { products as seedProducts } from '../data/products';

/* ─── Per-service mock flags ─── */
const MOCK_MODE = {
  auth:      false,   // real
  user:      false,   // real
  tenant:    false,   // real
  inventory: false,   // real ← products from DB
  order:     false,   // real ← orders from DB
  coupon:    false,
  review:    false,    // real ← reviews from DB
  registry:  false,   // real ← registries from DB
  currency:  false,    // real mock
};

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/* ─── Latency simulator (for mock calls) ─── */
const delay = (ms = 250) => new Promise(res => setTimeout(res, ms));

/* ─── LocalStorage helpers ─── */
const safeParse = (raw, fallback) => {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

/* ═══════════════════════════════════════════════════════════
   🔐 JWT TOKEN STORE
   ═══════════════════════════════════════════════════════════ */
const ACCESS_TOKEN_KEY  = 'amir_access_token';
const REFRESH_TOKEN_KEY = 'amir_refresh_token';

export const tokenStore = {
  get access()  { return localStorage.getItem(ACCESS_TOKEN_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_TOKEN_KEY); },
  set(access, refresh) {
    if (access)  localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/* ═══════════════════════════════════════════════════════════
   🌐 SHARED FETCH WRAPPER
   ═══════════════════════════════════════════════════════════ */
export async function apiRequest(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth && tokenStore.access) {
    finalHeaders['Authorization'] = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204 || res.status === 205) return null;

  let payload = null;
  try { payload = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    const err = new Error(payload?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = payload?.errors;
    throw err;
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, 'success')) {
    if (!payload.success) {
      const err = new Error(payload.message || 'Request failed');
      err.status = res.status;
      err.errors = payload.errors;
      throw err;
    }
    return payload.data ?? null;
  }

  return payload;
}

/* ═══════════════════════════════════════════════════════════
   🔐 AUTH SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */
export const authService = {
  async login({ email, password }) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    if (data?.accessToken) tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },

  async register({ name, email, password, role = 'customer', shopName, tenantId }) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      auth: false,
      body: { name, email, password, role, shopName, tenantId },
    });
    if (data?.accessToken) tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },

  async me() {
    return apiRequest('/auth/me', { auth: true });
  },

  logout() {
    tokenStore.clear();
  },
};

/* ═══════════════════════════════════════════════════════════
   👤 USER SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */
export const userService = {
  me() {
    return apiRequest('/users/me', { auth: true });
  },
  updateMe(patch) {
    return apiRequest('/users/me', { method: 'PATCH', body: patch, auth: true });
  },
  changePassword(currentPassword, newPassword) {
    return apiRequest('/users/me/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      auth: true,
    });
  },

  /* Team management */
  listTeam() {
    return apiRequest('/users', { auth: true });
  },
  approve(id) {
    return apiRequest(`/users/${id}/approve`, { method: 'PATCH', auth: true });
  },
  reject(id) {
    return apiRequest(`/users/${id}/reject`, { method: 'PATCH', auth: true });
  },
  remove(id) {
    return apiRequest(`/users/${id}`, { method: 'DELETE', auth: true });
  },
};

/* ═══════════════════════════════════════════════════════════
   🏪 TENANT SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */
export const tenantService = {
  async list() {
    return apiRequest('/tenants/public', { auth: false });
  },
  async me() {
    return apiRequest('/tenant/me', { auth: true });
  },
  async updateMe(patch) {
    return apiRequest('/tenant/me', { method: 'PATCH', body: patch, auth: true });
  },
};

/* ═══════════════════════════════════════════════════════════
   🎟️ COUPON SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */

/** Backend CouponDto → frontend coupon shape (mirrors Coupons.jsx expectations). */
function normalizeCoupon(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    code: dto.code,
    type: dto.type,
    value: Number(dto.value) || 0,
    minOrder: Number(dto.minOrder) || 0,
    maxUses: dto.maxUses ?? 0,
    uses: dto.uses ?? 0,
    expiresAt: dto.expiresAt || null,
    active: dto.isActive ?? true,        // isActive → active
    createdAt: dto.createdAt || new Date().toISOString(),
  };
}

/** Frontend coupon patch → backend field names. */
function denormalizeCoupon(patch) {
  const body = { ...patch };
  if ('active' in body) {
    body.isActive = body.active;
    delete body.active;
  }
  return body;
}

export const couponService = {
  /* Owner CRUD */
  list: async () => {
    if (MOCK_MODE.coupon) return [];    // shouldn't be called in mock mode
    const list = await apiRequest('/coupons', { auth: true });
    return (list || []).map(normalizeCoupon);
  },

  create: async (data) => {
    if (MOCK_MODE.coupon) throw new Error('Mock coupon create not implemented');
    const body = {
      code: data.code,
      type: data.type,
      value: data.value,
      minOrder: data.minOrder ?? 0,
      maxUses: data.maxUses ?? 0,
      expiresAt: data.expiresAt || null,
    };
    const dto = await apiRequest('/coupons', { method: 'POST', body, auth: true });
    return normalizeCoupon(dto);
  },

  update: async (id, patch) => {
    if (MOCK_MODE.coupon) throw new Error('Mock coupon update not implemented');
    const dto = await apiRequest(`/coupons/${id}`, {
      method: 'PATCH',
      body: denormalizeCoupon(patch),
      auth: true,
    });
    return normalizeCoupon(dto);
  },

  remove: async (id) => {
    if (MOCK_MODE.coupon) throw new Error('Mock coupon delete not implemented');
    return apiRequest(`/coupons/${id}`, { method: 'DELETE', auth: true });
  },

  /* Public — validation at checkout */
  validate: async (code, subtotal, tenantId) => {
  return apiRequest('/coupons/validate', {
    method: 'POST',
    auth: false,
    body: {
      code,
      subtotal,
      ...(tenantId ? { tenantId } : {}),
    },
  });
},
};

/* ═══════════════════════════════════════════════════════════
   💱 CURRENCY SERVICE — still mock
   ═══════════════════════════════════════════════════════════ */

const CURRENCY_KEY = 'amir_currency';
const RATE_KEY     = 'amir_currency_rates';

const SEED_RATES = {
  KES: 1,
  USD: 130,
};

export const CURRENCY_META = {
  KES: { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling', flag: '🇰🇪', decimals: 0 },
  USD: { code: 'USD', symbol: '$',   label: 'US Dollar',        flag: '🇺🇸', decimals: 2 },
};

async function mockGetRates() {
  await delay(80);
  const stored = safeParse(localStorage.getItem(RATE_KEY), null);
  if (stored && typeof stored === 'object') return stored;
  localStorage.setItem(RATE_KEY, JSON.stringify(SEED_RATES));
  return SEED_RATES;
}

async function mockGetCurrency() {
  await delay(30);
  const saved = localStorage.getItem(CURRENCY_KEY);
  if (saved && CURRENCY_META[saved]) return saved;
  return 'KES';
}

async function mockSetCurrency(code) {
  await delay(30);
  if (!CURRENCY_META[code]) throw new Error(`Unsupported currency: ${code}`);
  localStorage.setItem(CURRENCY_KEY, code);
  return code;
}

export const currencyService = {
  async getRates() {
    if (MOCK_MODE.currency) return mockGetRates();
    return apiRequest('/currency/rates', { auth: false });
  },

  async getPreferred() {
    if (MOCK_MODE.currency) return mockGetCurrency();
    return apiRequest('/currency/preference', { auth: true });
  },

  async setPreferred(code) {
    if (MOCK_MODE.currency) return mockSetCurrency(code);
    return apiRequest('/currency/preference', { method: 'PUT', body: { code }, auth: true });
  },

  /** Staff-only: update a currency rate. */
  async updateRate(code, { kesPerUnit, symbol, label }) {
    return apiRequest(`/currency/rates/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: { kesPerUnit, symbol, label },
      auth: true,
    });
  },

  /** Staff-only: create a new currency. */
  async createRate({ code, kesPerUnit, symbol, label }) {
    return apiRequest('/currency/rates', {
      method: 'POST',
      body: { code, kesPerUnit, symbol, label },
      auth: true,
    });
  },
};

/* ═══════════════════════════════════════════════════════════
   ❤️ WISHLIST SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */

export const wishlistService = {
  list: async () => {
    const list = await apiRequest('/wishlist', { auth: true });
    return (list || []).map(dto => ({
      id: dto.productId,          // ← page expects `id`, not `productId`
      productId: dto.productId,
      name: dto.name,
      image: dto.imageUrl || '',
      price: Number(dto.price) || 0,
      originalPrice: dto.originalPrice != null ? Number(dto.originalPrice) : null,
      badge: dto.badge,
      stock: dto.totalStock ?? 0,
      categoryId: dto.categoryId,
      addedAt: dto.addedAt,
    }));
  },
  add: (productId) => apiRequest(`/wishlist/${productId}`, { method: 'POST', auth: true }),
  remove: (productId) => apiRequest(`/wishlist/${productId}`, { method: 'DELETE', auth: true }),
  clear: () => apiRequest('/wishlist', { method: 'DELETE', auth: true }),
};

/* ═══════════════════════════════════════════════════════════
   ⚙️ PREFERENCES SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */

export const preferencesService = {
  get: () => apiRequest('/users/me/preferences', { auth: true }),
  update: (patch) => apiRequest('/users/me/preferences', {
    method: 'PATCH',
    body: patch,
    auth: true,
  }),
};

/* ═══════════════════════════════════════════════════════════
   🔔 NOTIFICATION SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */

export const notificationService = {
  list: async () => {
    const list = await apiRequest('/notifications', { auth: true });
    return (list || []).map(dto => ({
      id: dto.id,
      type: dto.type || 'info',
      title: dto.title || '',
      body: dto.body || '',
      link: dto.link || null,
      read: dto.read ?? false,
      createdAt: dto.createdAt,
    }));
  },
  markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH', auth: true }),
  markAllRead: () => apiRequest('/notifications/read-all', { method: 'PATCH', auth: true }),
  remove: (id) => apiRequest(`/notifications/${id}`, { method: 'DELETE', auth: true }),
  clearAll: () => apiRequest('/notifications', { method: 'DELETE', auth: true }),
};


/* ═══════════════════════════════════════════════════════════
   🔔 STOCK ALERTS — real backend
   ═══════════════════════════════════════════════════════════ */

export const stockAlertService = {
  subscribe: async ({ productId, size, color, email }) => {
    return apiRequest('/stock-alerts', {
      method: 'POST',
      body: { productId, size, color, email },
      auth: true,   // attach token if logged in; server overrides email
    });
  },
  mine: async () => {
    const list = await apiRequest('/stock-alerts/mine', { auth: true });
    return (list || []).map(dto => ({
      id: dto.id,
      productId: dto.productId,
      size: dto.size,
      color: dto.color,
      email: dto.email,
      notified: dto.notified,
      notifiedAt: dto.notifiedAt,
      createdAt: dto.createdAt,
    }));
  },
};

/* ═══════════════════════════════════════════════════════════
   📦 INVENTORY SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */

const INV_KEY         = 'amir_inventory';
const INV_VERSION_KEY = 'amir_inventory_version';
const SEED_VERSION    = 5;

/* ─── Normalizers ─── */

/** Parse JSON-string columns (sizes / colors / variants) safely */
const parseJson = (v, fallback) => {
  if (v == null || v === '') return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return fallback; }
};

/** Backend ProductDto → frontend product shape */
function normalizeProduct(dto) {
  if (!dto) return null;

  /* Map categoryId → slug so pages can filter by slug */
  const CATEGORY_SLUGS = {
    1: 'clothing',
    2: 'toys',
    3: 'feeding',
    4: 'gear',
    5: 'bath',
  };

  return {
    id: dto.id,
    name: dto.name,
    sku: dto.sku,
    description: dto.description || '',
    price: Number(dto.price) || 0,
    originalPrice: dto.originalPrice != null ? Number(dto.originalPrice) : null,
    image: dto.imageUrl || '',
    badge: dto.badge,
    categoryId: dto.categoryId,
    category: CATEGORY_SLUGS[dto.categoryId] || 'other',
    sizes: parseJson(dto.sizes, []),
    colors: parseJson(dto.colors, []),
    variants: parseJson(dto.variants, null),
    rating: dto.ratingAvg ?? 0,
    reviews: dto.reviewCount ?? 0,
    stock: dto.totalStock ?? 0,
  };
}

/** Backend OrderDto / OrderSummaryDto → frontend order shape */
function normalizeOrder(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    status: dto.status,
    subtotal: dto.subtotal,
    discount: dto.discount,
    tax: dto.tax,
    shipping: dto.shipping,
    total: dto.total,
    couponCode: dto.couponCode,
    couponId: dto.couponId,
    registryGiftId: dto.registryGiftId || null,
    customer: {
      name: dto.customerName,
      email: dto.customerEmail,
      phone: dto.customerPhone,
      address: dto.addressStreet,
      city: dto.addressCity,
      zip: dto.addressZip,
    },
    payment: dto.paymentMethod,
    paymentStatus: dto.paymentStatus,
    carrier: dto.carrierId,
    carrierName: dto.carrierName,
    trackingNumber: dto.trackingNumber,
    eta: dto.eta,
    checkpoints: dto.checkpoints || [],
    placedBy: dto.placedByName
      ? { name: dto.placedByName, role: dto.placedByRole, id: dto.placedById }
      : null,
    notes: dto.notes,
    items: (dto.items || dto.sampleItems || []).map(i => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      image: i.imageUrl,
      category: i.category,
      price: i.price,
      qty: i.qty,
      size: i.size,
      color: i.color,
      subtotal: i.subtotal,
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/* ─── Stock helpers ─── */

export const variantKey = (size, color) => `${size || '_'}-${color || '_'}`;

export const getVariantStock = (product, size, color) => {
  if (!product) return 0;
  if (!product.variants) return product.stock ?? 0;
  const key = variantKey(size, color);
  return product.variants[key]?.stock ?? 0;
};

export const getTotalStock = (product) => {
  if (!product) return 0;
  if (!product.variants) return product.stock ?? 0;
  return Object.values(product.variants)
    .reduce((sum, v) => sum + (v.stock || 0), 0);
};

export const isVariantInStock = (product, size, color) =>
  getVariantStock(product, size, color) > 0;

export const isProductOutOfStock = (product) =>
  getTotalStock(product) === 0;

/* ─── Mock storage ─── */

function readInvLocal() {
  try {
    const savedVersion = Number(localStorage.getItem(INV_VERSION_KEY));
    const saved = safeParse(localStorage.getItem(INV_KEY), null);
    if (!saved || savedVersion !== SEED_VERSION) {
      localStorage.setItem(INV_KEY, JSON.stringify(seedProducts));
      localStorage.setItem(INV_VERSION_KEY, String(SEED_VERSION));
      return seedProducts;
    }
    return saved;
  } catch {
    return seedProducts;
  }
}

function writeInvLocal(list) {
  localStorage.setItem(INV_KEY, JSON.stringify(list));
  localStorage.setItem(INV_VERSION_KEY, String(SEED_VERSION));
}

async function mockInvList() {
  await delay(120);
  return readInvLocal();
}

async function mockInvCreate(product) {
  await delay(180);
  const list = readInvLocal();
  const id = Math.max(0, ...list.map(p => p.id)) + 1;

  let variants = product.variants;
  if (!variants && (product.sizes?.length || product.colors?.length)) {
    const sizes  = product.sizes?.length  ? product.sizes  : ['_'];
    const colors = product.colors?.length ? product.colors : ['_'];
    const perVariant = Math.floor((product.stock ?? 0) / (sizes.length * colors.length));
    variants = {};
    sizes.forEach(s => colors.forEach(c => {
      variants[variantKey(s, c)] = { stock: perVariant };
    }));
  }

  const totalStock = variants
    ? Object.values(variants).reduce((s, v) => s + (v.stock || 0), 0)
    : (product.stock ?? 0);

  const created = { ...product, id, variants: variants || product.variants, stock: totalStock };
  writeInvLocal([...list, created]);
  return created;
}

async function mockInvUpdate(id, patch) {
  await delay(150);
  const list = readInvLocal();
  const next = list.map(p => p.id === id ? { ...p, ...patch } : p);
  writeInvLocal(next);
  return next.find(p => p.id === id);
}

async function mockInvRemove(id) {
  await delay(120);
  writeInvLocal(readInvLocal().filter(p => p.id !== id));
  return { ok: true };
}

async function mockInvSetVariantStock(productId, size, color, newStock) {
  await delay(80);
  const list = readInvLocal();
  const next = list.map(p => {
    if (p.id !== productId) return p;
    const key = variantKey(size, color);
    const safeStock = Math.max(0, Number(newStock) || 0);
    const updatedVariants = {
      ...(p.variants || {}),
      [key]: { ...(p.variants?.[key] || {}), stock: safeStock },
    };
    const totalStock = Object.values(updatedVariants)
      .reduce((sum, v) => sum + (v.stock || 0), 0);
    return { ...p, variants: updatedVariants, stock: totalStock };
  });
  writeInvLocal(next);
  return next.find(p => p.id === productId);
}

async function mockInvDeductVariant(productId, size, color, qty) {
  await delay(80);
  const list = readInvLocal();
  const next = list.map(p => {
    if (p.id !== productId) return p;
    const key = variantKey(size, color);
    const current = p.variants?.[key]?.stock ?? p.stock ?? 0;
    const newStock = Math.max(0, current - qty);
    const updatedVariants = {
      ...(p.variants || {}),
      [key]: { ...(p.variants?.[key] || {}), stock: newStock },
    };
    const totalStock = Object.values(updatedVariants)
      .reduce((sum, v) => sum + (v.stock || 0), 0);
    return { ...p, variants: updatedVariants, stock: totalStock };
  });
  writeInvLocal(next);
  return next.find(p => p.id === productId);
}

async function mockInvRestoreVariant(productId, size, color, qty) {
  await delay(80);
  const list = readInvLocal();
  const next = list.map(p => {
    if (p.id !== productId) return p;
    const key = variantKey(size, color);
    const current = p.variants?.[key]?.stock ?? p.stock ?? 0;
    const newStock = current + qty;
    const updatedVariants = {
      ...(p.variants || {}),
      [key]: { ...(p.variants?.[key] || {}), stock: newStock },
    };
    const totalStock = Object.values(updatedVariants)
      .reduce((sum, v) => sum + (v.stock || 0), 0);
    return { ...p, variants: updatedVariants, stock: totalStock };
  });
  writeInvLocal(next);
  return next.find(p => p.id === productId);
}

/* ─── Inventory service ─── */

export const inventoryService = {
  list: async () => {
    if (MOCK_MODE.inventory) return mockInvList();
    // auth:true only attaches the token when one exists, so it is safe for guests too
    const res = await apiRequest('/products?page=0&size=200', { auth: true });

    const items = Array.isArray(res)            ? res
                : Array.isArray(res?.content)   ? res.content
                : Array.isArray(res?.products)  ? res.products
                : Array.isArray(res?.items)     ? res.items
                : null;

    if (!items) {
      console.error('[Inventory] Unexpected /products response:', res);
      throw new Error('Unexpected products response shape');
    }
    return items.map(normalizeProduct);
  },

  getById: async (id) => {
    if (MOCK_MODE.inventory) return readInvLocal().find(p => p.id === id);
    const dto = await apiRequest(`/products/${id}`, { auth: true });
    return normalizeProduct(dto);
  },

  create: (product) =>
    MOCK_MODE.inventory
      ? mockInvCreate(product)
      : apiRequest('/products', { method: 'POST', body: product, auth: true }),

  update: (id, patch) =>
    MOCK_MODE.inventory
      ? mockInvUpdate(id, patch)
      : apiRequest(`/products/${id}`, { method: 'PATCH', body: patch, auth: true }),

  remove: (id) =>
    MOCK_MODE.inventory
      ? mockInvRemove(id)
      : apiRequest(`/products/${id}`, { method: 'DELETE', auth: true }),

  updateStock: (id, stock) =>
    MOCK_MODE.inventory
      ? mockInvUpdate(id, { stock: Math.max(0, stock) })
      : apiRequest(`/products/${id}/stock`, { method: 'PUT', body: { stock }, auth: true }),

  setVariantStock: (productId, size, color, newStock) =>
    MOCK_MODE.inventory
      ? mockInvSetVariantStock(productId, size, color, newStock)
      : apiRequest(`/products/${productId}/variants`, {
          method: 'PATCH',
          body: { size, color, stock: newStock },
          auth: true,
        }),

  deductVariantStock: (productId, size, color, qty) =>
    MOCK_MODE.inventory
      ? mockInvDeductVariant(productId, size, color, qty)
      : apiRequest(`/products/${productId}/variants/deduct`, {
          method: 'POST',
          body: { size, color, qty },
          auth: true,
        }),

  restoreVariantStock: (productId, size, color, qty) =>
    MOCK_MODE.inventory
      ? mockInvRestoreVariant(productId, size, color, qty)
      : apiRequest(`/products/${productId}/variants/restore`, {
          method: 'POST',
          body: { size, color, qty },
          auth: true,
        }),
};

/* ═══════════════════════════════════════════════════════════
   ⭐ REVIEW SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */

/** Backend ReviewDto → frontend review shape (matches ReviewCard.jsx). */
function normalizeReview(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    productId: dto.productId,
    userId: dto.userId,
    authorName: dto.authorName || 'Guest',
    authorEmail: dto.authorEmail || null,
    authorRole: dto.authorRole || 'customer',
    rating: Number(dto.rating) || 0,
    title: dto.title || '',
    comment: dto.comment || '',
    image: dto.imageUrl || '',
    photos: dto.photos || [],
    verified: dto.verified ?? false,
    helpful: dto.helpful ?? 0,
    notHelpful: dto.notHelpful ?? 0,
    status: dto.status || 'published',
    replies: dto.replies || [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

const GUEST_VOTE_KEY = 'amir_review_guest_token';

/** Stable per-browser token for guest votes so they can only vote once per review. */
function getGuestVoteToken() {
  let token = localStorage.getItem(GUEST_VOTE_KEY);
  if (!token) {
    token = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GUEST_VOTE_KEY, token);
  }
  return token;
}

export const reviewService = {
  /** List reviews — pass productId to filter to one product. */
  list: async (productId) => {
    if (MOCK_MODE.review) return [];
    const path = productId ? `/reviews/product/${productId}` : '/reviews';
    const list = await apiRequest(path, { auth: true });
    return (list || []).map(normalizeReview);
  },

  /** Create a review. Backend fills author info from the JWT. */
  create: async (review) => {
    if (MOCK_MODE.review) throw new Error('Mock review create not implemented');
    const body = {
      productId: review.productId,
      rating: review.rating,
      title: review.title || '',
      comment: review.comment || '',
      imageUrl: review.image || '',
      photos: review.photos || [],
    };
    const dto = await apiRequest('/reviews', { method: 'POST', body, auth: true });
    return normalizeReview(dto);
  },

  /** Vote helpful / not helpful. Sends a guest token when not signed in. */
  vote: async (id, vote) => {
    if (MOCK_MODE.review) throw new Error('Mock review vote not implemented');
    const dto = await apiRequest(`/reviews/${id}/vote`, {
      method: 'POST',
      body: {
        vote,                                // 'up' | 'down'
        guestToken: getGuestVoteToken(),
      },
      auth: true,                            // harmless for guests — token just isn't sent
    });
    return normalizeReview(dto);
  },

  /** Staff reply. */
  reply: async (id, text) => {
    if (MOCK_MODE.review) throw new Error('Mock review reply not implemented');
    const dto = await apiRequest(`/reviews/${id}/reply`, {
      method: 'POST',
      body: { text },
      auth: true,
    });
    return normalizeReview(dto);
  },

  /** Staff moderation — 'published' | 'hidden'. */
  setStatus: async (id, status) => {
    if (MOCK_MODE.review) throw new Error('Mock review status not implemented');
    const dto = await apiRequest(`/reviews/${id}/status`, {
      method: 'PATCH',
      body: { status },
      auth: true,
    });
    return normalizeReview(dto);
  },

  /** Owner/admin delete. Author can also delete their own via same endpoint. */
  remove: async (id) => {
    if (MOCK_MODE.review) return { ok: true };
    return apiRequest(`/reviews/${id}`, { method: 'DELETE', auth: true });
  },
};

/* ═══════════════════════════════════════════════════════════
   🍼 REGISTRY SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */

/** Backend RegistryDto → frontend registry shape (matches RegistryContext). */
function normalizeRegistry(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    slug: dto.slug,
    ownerUserId: dto.ownerUserId,
    ownerEmail: dto.ownerEmail,
    ownerName: dto.ownerName,
    babyName: dto.babyName,
    dueDate: dto.dueDate,
    theme: dto.theme || '',
    message: dto.message || '',
    coverImage: dto.coverImageUrl || '',
    items: Array.isArray(dto.items) ? dto.items : [],
    gifts: Array.isArray(dto.gifts) ? dto.gifts : [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const registryService = {
  /* ─── Owner reads ─── */
  mine: async () => {
    if (MOCK_MODE.registry) return null;
    const dto = await apiRequest('/registries/mine', { auth: true }).catch(err => {
      // 404 = user has no registry yet — not an error, just return null
      if (err?.status === 404) return null;
      throw err;
    });
    return normalizeRegistry(dto);
  },

  /* ─── Public read by slug (guest view) ─── */
  getBySlug: async (slug) => {
    if (MOCK_MODE.registry) return null;
    const dto = await apiRequest(`/registries/slug/${slug}`, { auth: false });
    return normalizeRegistry(dto);
  },

  /* ─── Create ─── */
  create: async (data) => {
    if (MOCK_MODE.registry) throw new Error('Mock registry create not implemented');
    const body = {
      babyName: data.babyName,
      dueDate: data.dueDate,
      theme: data.theme || null,
      message: data.message || null,
      coverImageUrl: data.coverImage || null,
    };
    const dto = await apiRequest('/registries', { method: 'POST', body, auth: true });
    return normalizeRegistry(dto);
  },

  /* ─── Update ─── */
  update: async (id, patch) => {
    if (MOCK_MODE.registry) throw new Error('Mock registry update not implemented');
    const body = {
      babyName: patch.babyName,
      dueDate: patch.dueDate,
      theme: patch.theme,
      message: patch.message,
      coverImageUrl: patch.coverImage,
    };
    const dto = await apiRequest(`/registries/${id}`, { method: 'PATCH', body, auth: true });
    return normalizeRegistry(dto);
  },

  /* ─── Delete ─── */
  remove: async (id) => {
    if (MOCK_MODE.registry) return { ok: true };
    return apiRequest(`/registries/${id}`, { method: 'DELETE', auth: true });
  },

  /* ─── Items ─── */
  addItem: async (registryId, item) => {
    if (MOCK_MODE.registry) throw new Error('Mock addItem not implemented');
    const body = {
      productId: item.productId,
      name: item.name,
      image: item.image || '',
      price: item.price,
      category: item.category || '',
      priority: item.priority || 'medium',
      note: item.note || '',
    };
    const dto = await apiRequest(`/registries/${registryId}/items`, {
      method: 'POST',
      body,
      auth: true,
    });
    return normalizeRegistry(dto);
  },

  removeItem: async (registryId, itemId) => {
    if (MOCK_MODE.registry) throw new Error('Mock removeItem not implemented');
    const dto = await apiRequest(`/registries/${registryId}/items/${itemId}`, {
      method: 'DELETE',
      auth: true,
    });
    return normalizeRegistry(dto);
  },

  updateItemPriority: async (registryId, itemId, priority) => {
    if (MOCK_MODE.registry) throw new Error('Mock updatePriority not implemented');
    const dto = await apiRequest(`/registries/${registryId}/items/${itemId}/priority`, {
      method: 'PATCH',
      body: { priority },
      auth: true,
    });
    return normalizeRegistry(dto);
  },

  /* ─── Gifts (public — guest can gift) ─── */
  markGifted: async (registryId, itemId, gift) => {
    if (MOCK_MODE.registry) throw new Error('Mock markGifted not implemented');
    const body = {
      giverName: gift.giverName,
      giverEmail: gift.giverEmail || '',
      message: gift.message || '',
      qty: gift.qty ?? 1,
    };
    const dto = await apiRequest(`/registries/${registryId}/items/${itemId}/gift`, {
      method: 'POST',
      body,
      auth: false,
    });
    return normalizeRegistry(dto);
  },

  unmarkGifted: async (registryId, giftId) => {
    if (MOCK_MODE.registry) throw new Error('Mock unmarkGifted not implemented');
    const dto = await apiRequest(`/registries/${registryId}/gifts/${giftId}`, {
      method: 'DELETE',
      auth: true,
    });
    return normalizeRegistry(dto);
  },

  markThanked: async (registryId, giftId, thanked) => {
    if (MOCK_MODE.registry) throw new Error('Mock markThanked not implemented');
    const dto = await apiRequest(`/registries/${registryId}/gifts/${giftId}/thanked`, {
      method: 'PATCH',
      body: { thanked },
      auth: true,
    });
    return normalizeRegistry(dto);
  },
};

/* ═══════════════════════════════════════════════════════════
   🚚 ORDER SERVICE — real backend
   ═══════════════════════════════════════════════════════════ */

const ORDERS_KEY = 'amir_orders';

function readOrdersLocal() {
  return safeParse(localStorage.getItem(ORDERS_KEY), []);
}

function writeOrdersLocal(list) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
}

async function mockOrdersList() {
  await delay(120);
  return readOrdersLocal();
}

async function mockOrdersUpdate(id, patch) {
  await delay(120);
  const all = readOrdersLocal();
  const next = all.map(o => o.id === id ? { ...o, ...patch } : o);
  writeOrdersLocal(next);
  return next.find(o => o.id === id);
}

async function mockOrdersRemove(id) {
  await delay(120);
  writeOrdersLocal(readOrdersLocal().filter(o => o.id !== id));
  return { ok: true };
}

async function mockOrdersAddCheckpoint(orderId, checkpoint) {
  await delay(80);
  const all = readOrdersLocal();
  const order = all.find(o => o.id === orderId);
  if (!order) return null;

  const updated = {
    ...order,
    checkpoints: [...(order.checkpoints || []), checkpoint],
    updatedAt: new Date().toISOString(),
  };

  writeOrdersLocal(all.map(o => o.id === orderId ? updated : o));
  return updated;
}

export const orderService = {
  /* ─── Real backend — order flow ─── */
  create: async (payload) => {
    if (MOCK_MODE.order) {
      throw new Error('Mock order creation not implemented');
    }
    const dto = await apiRequest('/orders', { method: 'POST', body: payload, auth: true });
    return normalizeOrder(dto);
  },

  listMine: async () => {
    if (MOCK_MODE.order) return mockOrdersList();
    const list = await apiRequest('/orders/mine', { auth: true });
    return (list || []).map(normalizeOrder);
  },

  listAll: async (status) => {
    if (MOCK_MODE.order) return mockOrdersList();
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const list = await apiRequest(`/orders${qs}`, { auth: true });
    return (list || []).map(normalizeOrder);
  },

  pendingCount: async () => {
    return apiRequest('/orders/pending-count', { auth: true });
  },

   track: async (query) => {
    if (!query) return null;
    const dto = await apiRequest(`/orders/track?query=${encodeURIComponent(query)}`, { auth: false });
    return normalizeOrder(dto);
  },

  getById: async (id) => {
    if (MOCK_MODE.order) {
      return readOrdersLocal().find(o => o.id === id);
    }
    const dto = await apiRequest(`/orders/${id}`, { auth: true });
    return normalizeOrder(dto);
  },

  confirm: async (id) => {
    if (MOCK_MODE.order) return mockOrdersUpdate(id, { status: 'confirmed' });
    const dto = await apiRequest(`/orders/${id}/confirm`, { method: 'PATCH', auth: true });
    return normalizeOrder(dto);
  },

  fulfill: async (id) => {
    if (MOCK_MODE.order) return mockOrdersUpdate(id, { status: 'fulfilled' });
    const dto = await apiRequest(`/orders/${id}/fulfill`, { method: 'PATCH', auth: true });
    return normalizeOrder(dto);
  },

  cancel: async (id) => {
    if (MOCK_MODE.order) return mockOrdersUpdate(id, { status: 'cancelled' });
    const dto = await apiRequest(`/orders/${id}/cancel`, { method: 'PATCH', auth: true });
    return normalizeOrder(dto);
  },

  /* ─── Legacy methods ─── */
  list: () =>
    MOCK_MODE.order ? mockOrdersList() : apiRequest('/orders', { auth: true }),

  update: (id, patch) =>
    MOCK_MODE.order
      ? mockOrdersUpdate(id, patch)
      : apiRequest(`/orders/${id}`, { method: 'PATCH', body: patch, auth: true }),

  updatePaymentStatus: async (id, status) => {
    const dto = await apiRequest(`/orders/${id}/payment-status`, {
      method: 'PATCH',
      body: { status },
      auth: true,
    });
    return normalizeOrder(dto);
  },    

  remove: (id) =>
    MOCK_MODE.order
      ? mockOrdersRemove(id)
      : apiRequest(`/orders/${id}`, { method: 'DELETE', auth: true }),

  addCheckpoint: (orderId, checkpoint) =>
    MOCK_MODE.order
      ? mockOrdersAddCheckpoint(orderId, checkpoint)
      : apiRequest(`/orders/${orderId}/checkpoints`, {
          method: 'POST',
          body: checkpoint,
          auth: true,
        }),
};

/* ═══════════════════════════════════════════════════════════
   EXPORT — raw helpers
   ═══════════════════════════════════════════════════════════ */
export { apiRequest as request, delay, safeParse, MOCK_MODE, BASE_URL };

function normalizeReturn(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    orderId: dto.orderId,
    userId: dto.userId,
    customerName: dto.customerName,
    customerEmail: dto.customerEmail,
    reason: dto.reason,
    note: dto.note,
    status: dto.status,
    rejectionReason: dto.rejectionReason,
    refundAmount: Number(dto.refundAmount) || 0,
    items: dto.items || [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const returnService = {
  create: async (data) => {
    const dto = await apiRequest('/returns', { method: 'POST', body: data, auth: true });
    return normalizeReturn(dto);
  },
  listAll: async () => {
    const list = await apiRequest('/returns', { auth: true });
    return (list || []).map(normalizeReturn);
  },
  listMine: async () => {
    const list = await apiRequest('/returns/mine', { auth: true });
    return (list || []).map(normalizeReturn);
  },
  updateStatus: async (id, status, rejectionReason = null) => {
    const dto = await apiRequest(`/returns/${id}/status`, {
      method: 'PATCH',
      body: { status, rejectionReason },
      auth: true,
    });
    return normalizeReturn(dto);
  },
};

function normalizeFeedback(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    userId: dto.userId,
    name: dto.name,
    email: dto.email,
    subject: dto.subject,
    message: dto.message,
    sentBy: dto.sentBy,
    status: dto.status,
    replies: dto.replies || [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const feedbackService = {
  create: async (data) => {
    const dto = await apiRequest('/feedback', { method: 'POST', body: data, auth: true });
    return normalizeFeedback(dto);
  },
  listAll: async () => {
    const list = await apiRequest('/feedback', { auth: true });
    return (list || []).map(normalizeFeedback);
  },
  listMine: async (email) => {
    const list = await apiRequest(`/feedback/mine?email=${encodeURIComponent(email)}`, { auth: true });
    return (list || []).map(normalizeFeedback);
  },
  updateStatus: async (id, status) => {
    const dto = await apiRequest(`/feedback/${id}/status`, { method: 'PATCH', body: { status }, auth: true });
    return normalizeFeedback(dto);
  },
    reply: async (id, data) => {
    const dto = await apiRequest(`/feedback/${id}/reply`, { method: 'POST', body: data, auth: true });
    return normalizeFeedback(dto);
  },
};

/* ═══════════════════════════════════════════════════════════
   DEFAULT EXPORT — namespaced services
   ═══════════════════════════════════════════════════════════ */
export default {
  currency: currencyService,
  inventory: inventoryService,
  coupon: couponService, 
  review: reviewService,
  registry: registryService,
  order: orderService,
  auth: authService,
  user: userService,
  tenant: tenantService,
  return: returnService,
  feedback: feedbackService,
  notification: notificationService,
  wishlist: wishlistService,
  preferences: preferencesService,
  stockAlert: stockAlertService,
};