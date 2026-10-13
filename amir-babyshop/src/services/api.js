/* ═══════════════════════════════════════════════════════════
   API SERVICE LAYER — base wrapper + mocked endpoints
   
   Today:  all calls hit `mock*()` functions (Promise-based)
   Later:  swap MOCK_MODE to false and point BASE_URL at your API
   
   Nothing else in the app needs to change when you go live.
   ═══════════════════════════════════════════════════════════ */

import { products as seedProducts } from '../data/products';

const MOCK_MODE = true;
const BASE_URL = '/api';

/* ─── Latency simulator (so loading states feel real) ─── */
const delay = (ms = 250) => new Promise(res => setTimeout(res, ms));

/* ─── Local storage helpers ─── */
const safeParse = (raw, fallback) => {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

/* ═══════════════════════════════════════════════════════════
   BASE FETCH WRAPPER (used once backend is real)
   ═══════════════════════════════════════════════════════════ */
async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

/* ═══════════════════════════════════════════════════════════
   💱 CURRENCY SERVICE
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
    if (MOCK_MODE) return mockGetRates();
    return request('/currency/rates');
  },

  async getPreferred() {
    if (MOCK_MODE) return mockGetCurrency();
    return request('/currency/preference');
  },

  async setPreferred(code) {
    if (MOCK_MODE) return mockSetCurrency(code);
    return request('/currency/preference', { method: 'PUT', body: { code } });
  },
};

/* ═══════════════════════════════════════════════════════════
   📦 INVENTORY SERVICE
   ═══════════════════════════════════════════════════════════ */

const INV_KEY         = 'amir_inventory';
const INV_VERSION_KEY = 'amir_inventory_version';
const SEED_VERSION    = 5;

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

export const inventoryService = {
  list: () =>
    MOCK_MODE ? mockInvList() : request('/products'),

  create: (product) =>
    MOCK_MODE ? mockInvCreate(product) : request('/products', { method: 'POST', body: product }),

  update: (id, patch) =>
    MOCK_MODE ? mockInvUpdate(id, patch) : request(`/products/${id}`, { method: 'PATCH', body: patch }),

  remove: (id) =>
    MOCK_MODE ? mockInvRemove(id) : request(`/products/${id}`, { method: 'DELETE' }),

  updateStock: (id, stock) =>
    MOCK_MODE
      ? mockInvUpdate(id, { stock: Math.max(0, stock) })
      : request(`/products/${id}/stock`, { method: 'PUT', body: { stock } }),

  setVariantStock: (productId, size, color, newStock) =>
    MOCK_MODE
      ? mockInvSetVariantStock(productId, size, color, newStock)
      : request(`/products/${productId}/variants`, {
          method: 'PATCH',
          body: { size, color, stock: newStock },
        }),

  deductVariantStock: (productId, size, color, qty) =>
    MOCK_MODE
      ? mockInvDeductVariant(productId, size, color, qty)
      : request(`/products/${productId}/variants/deduct`, {
          method: 'POST',
          body: { size, color, qty },
        }),

  restoreVariantStock: (productId, size, color, qty) =>
    MOCK_MODE
      ? mockInvRestoreVariant(productId, size, color, qty)
      : request(`/products/${productId}/variants/restore`, {
          method: 'POST',
          body: { size, color, qty },
        }),
};

/* ═══════════════════════════════════════════════════════════
   ⭐ REVIEW SERVICE
   ═══════════════════════════════════════════════════════════ */

const REVIEWS_KEY = 'amir_reviews';

function readReviewsLocal() {
  return safeParse(localStorage.getItem(REVIEWS_KEY), []);
}

function writeReviewsLocal(list) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(list));
}

async function mockReviewsList(productId) {
  await delay(120);
  const all = readReviewsLocal();
  if (!productId) return all;
  return all.filter(r => r.productId === productId);
}

async function mockReviewsCreate(review) {
  await delay(180);
  const all = readReviewsLocal();
  const created = {
    ...review,
    id: review.id || `RV-${Date.now().toString().slice(-6)}`,
    createdAt: review.createdAt || new Date().toISOString(),
    helpful: review.helpful ?? 0,
    notHelpful: review.notHelpful ?? 0,
    replies: review.replies || [],
    photos: review.photos || [],
  };
  writeReviewsLocal([created, ...all]);
  return created;
}

async function mockReviewsUpdate(id, patch) {
  await delay(120);
  const all = readReviewsLocal();
  const next = all.map(r => r.id === id ? { ...r, ...patch } : r);
  writeReviewsLocal(next);
  return next.find(r => r.id === id);
}

async function mockReviewsRemove(id) {
  await delay(120);
  writeReviewsLocal(readReviewsLocal().filter(r => r.id !== id));
  return { ok: true };
}

export const reviewService = {
  list: (productId) =>
    MOCK_MODE
      ? mockReviewsList(productId)
      : request(productId ? `/products/${productId}/reviews` : '/reviews'),

  create: (review) =>
    MOCK_MODE
      ? mockReviewsCreate(review)
      : request('/reviews', { method: 'POST', body: review }),

  update: (id, patch) =>
    MOCK_MODE
      ? mockReviewsUpdate(id, patch)
      : request(`/reviews/${id}`, { method: 'PATCH', body: patch }),

  remove: (id) =>
    MOCK_MODE
      ? mockReviewsRemove(id)
      : request(`/reviews/${id}`, { method: 'DELETE' }),
};

/* ═══════════════════════════════════════════════════════════
   🍼 REGISTRY SERVICE
   ═══════════════════════════════════════════════════════════ */

const REGISTRY_KEY = 'amir_registries';

function readRegistryLocal() {
  return safeParse(localStorage.getItem(REGISTRY_KEY), []);
}

function writeRegistryLocal(list) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
}

async function mockRegistryList() {
  await delay(120);
  return readRegistryLocal();
}

async function mockRegistryCreate(registry) {
  await delay(180);
  const all = readRegistryLocal();
  writeRegistryLocal([registry, ...all]);
  return registry;
}

async function mockRegistryUpdate(id, patch) {
  await delay(120);
  const all = readRegistryLocal();
  const next = all.map(r => r.id === id ? { ...r, ...patch } : r);
  writeRegistryLocal(next);
  return next.find(r => r.id === id);
}

async function mockRegistryRemove(id) {
  await delay(120);
  writeRegistryLocal(readRegistryLocal().filter(r => r.id !== id));
  return { ok: true };
}

export const registryService = {
  list: () =>
    MOCK_MODE ? mockRegistryList() : request('/registries'),

  create: (registry) =>
    MOCK_MODE
      ? mockRegistryCreate(registry)
      : request('/registries', { method: 'POST', body: registry }),

  update: (id, patch) =>
    MOCK_MODE
      ? mockRegistryUpdate(id, patch)
      : request(`/registries/${id}`, { method: 'PATCH', body: patch }),

  remove: (id) =>
    MOCK_MODE
      ? mockRegistryRemove(id)
      : request(`/registries/${id}`, { method: 'DELETE' }),
};

/* ═══════════════════════════════════════════════════════════
   🚚 ORDER SERVICE (tracking extension)
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
  list: () =>
    MOCK_MODE ? mockOrdersList() : request('/orders'),

  update: (id, patch) =>
    MOCK_MODE ? mockOrdersUpdate(id, patch) : request(`/orders/${id}`, { method: 'PATCH', body: patch }),

  remove: (id) =>
    MOCK_MODE ? mockOrdersRemove(id) : request(`/orders/${id}`, { method: 'DELETE' }),

  addCheckpoint: (orderId, checkpoint) =>
    MOCK_MODE
      ? mockOrdersAddCheckpoint(orderId, checkpoint)
      : request(`/orders/${orderId}/checkpoints`, { method: 'POST', body: checkpoint }),
};

/* ═══════════════════════════════════════════════════════════
   EXPORT — raw helpers (for future feature services)
   ═══════════════════════════════════════════════════════════ */
export { request, delay, safeParse, MOCK_MODE };

/* ═══════════════════════════════════════════════════════════
   DEFAULT EXPORT — namespaced services
   ═══════════════════════════════════════════════════════════ */
export default {
  currency: currencyService,
  inventory: inventoryService,
  review: reviewService,
  registry: registryService,
  order: orderService,
};