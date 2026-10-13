import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { registryService } from '../services/api';
import { useAuth } from './AuthContext';

const RegistryContext = createContext();
export const useRegistry = () => useContext(RegistryContext);

/* ═══════════════════════════════════════════════════════════
   REGISTRY PROVIDER
   ─────────────────────────────────────────────────────────
   - One registry per customer (keyed by owner email)
   - Registry has: baby info, items[], gifts[]
   - Items can be "gifted" by guests (tracked via gifts[])
   ═══════════════════════════════════════════════════════════ */
export function RegistryProvider({ children }) {
  const { user } = useAuth();
  const [registries, setRegistries] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  /* ─── Load from service ─── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await registryService.list();
        if (!cancelled) setRegistries(list);
      } catch (err) {
        console.warn('[Registry] load failed:', err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ═══════════════════════════════════════════════════════════
     CREATE registry
     ═══════════════════════════════════════════════════════════ */
  const createRegistry = async (data) => {
    if (!user?.email) return { ok: false, error: 'Sign in to create a registry' };
    if (!data.babyName?.trim()) return { ok: false, error: 'Baby name is required' };
    if (!data.dueDate) return { ok: false, error: 'Due date is required' };

    // One per owner
    if (registries.some(r => r.ownerEmail === user.email.toLowerCase())) {
      return { ok: false, error: 'You already have a registry. Edit it instead.' };
    }

    // Build unique slug from baby name
    const baseSlug = data.babyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
    const suffix = Date.now().toString(36).slice(-4);
    const slug = `${baseSlug}-${suffix}`;

    const registry = {
      id: `RG-${Date.now().toString().slice(-6)}`,
      slug,
      ownerEmail: user.email.toLowerCase(),
      ownerName: user.name,
      babyName: data.babyName.trim(),
      dueDate: data.dueDate,
      theme: (data.theme || '').trim(),
      message: (data.message || '').trim(),
      coverImage: data.coverImage || '',
      items: [],
      gifts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRegistries(prev => [registry, ...prev]);
    registryService.create(registry).catch(err =>
      console.warn('[Registry] create failed:', err)
    );
    return { ok: true, registry };
  };

  /* ═══════════════════════════════════════════════════════════
     UPDATE registry (baby info etc.)
     ═══════════════════════════════════════════════════════════ */
  const updateRegistry = async (id, patch) => {
    setRegistries(prev => prev.map(r =>
      r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
    ));
    registryService.update(id, patch).catch(err =>
      console.warn('[Registry] update failed:', err)
    );
  };

  /* ═══════════════════════════════════════════════════════════
     DELETE registry
     ═══════════════════════════════════════════════════════════ */
  const deleteRegistry = async (id) => {
    setRegistries(prev => prev.filter(r => r.id !== id));
    registryService.remove(id).catch(err =>
      console.warn('[Registry] delete failed:', err)
    );
  };

  /* ═══════════════════════════════════════════════════════════
     ADD product to registry
     ═══════════════════════════════════════════════════════════ */
  const addItem = (registryId, product, { priority = 'medium', note = '' } = {}) => {
    const reg = registries.find(r => r.id === registryId);
    if (!reg) return { ok: false, error: 'Registry not found' };

    if (reg.items.some(i => i.productId === product.id)) {
      return { ok: false, error: 'Already in your registry' };
    }

    const newItem = {
      id: `RI-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      category: product.category,
      priority, // 'low' | 'medium' | 'high'
      note: note.trim(),
      addedAt: new Date().toISOString(),
    };

    updateRegistry(registryId, { items: [...reg.items, newItem] });
    return { ok: true, item: newItem };
  };

  /* ═══════════════════════════════════════════════════════════
     REMOVE product from registry
     ═══════════════════════════════════════════════════════════ */
  const removeItem = (registryId, itemId) => {
    const reg = registries.find(r => r.id === registryId);
    if (!reg) return;
    updateRegistry(registryId, {
      items: reg.items.filter(i => i.id !== itemId),
    });
  };

  /* ═══════════════════════════════════════════════════════════
     UPDATE item (priority, note)
     ═══════════════════════════════════════════════════════════ */
  const updateItem = (registryId, itemId, patch) => {
    const reg = registries.find(r => r.id === registryId);
    if (!reg) return;
    updateRegistry(registryId, {
      items: reg.items.map(i => i.id === itemId ? { ...i, ...patch } : i),
    });
  };

  /* ═══════════════════════════════════════════════════════════
     GUEST: mark item as gifted
     ═══════════════════════════════════════════════════════════ */
  const markGifted = (registryId, itemId, { giverName, giverEmail = '', message = '', qty = 1 }) => {
    if (!giverName?.trim()) return { ok: false, error: 'Your name is required' };

    const reg = registries.find(r => r.id === registryId);
    if (!reg) return { ok: false, error: 'Registry not found' };

    const item = reg.items.find(i => i.id === itemId);
    if (!item) return { ok: false, error: 'Item not found' };

    if (reg.gifts.some(g => g.itemId === itemId)) {
      return { ok: false, error: 'Someone already claimed this item' };
    }

    const gift = {
      id: `GF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
      itemId,
      itemName: item.name,
      giverName: giverName.trim(),
      giverEmail: giverEmail.trim().toLowerCase(),
      message: message.trim(),
      qty: Number(qty) || 1,
      giftedAt: new Date().toISOString(),
    };

    updateRegistry(registryId, { gifts: [...reg.gifts, gift] });
    return { ok: true, gift };
  };

  /* ═══════════════════════════════════════════════════════════
     OWNER: unmark a gift (if guest made a mistake)
     ═══════════════════════════════════════════════════════════ */
  const unmarkGifted = (registryId, giftId) => {
    const reg = registries.find(r => r.id === registryId);
    if (!reg) return;
    updateRegistry(registryId, {
      gifts: reg.gifts.filter(g => g.id !== giftId),
    });
  };

  /* ═══════════════════════════════════════════════════════════
     OWNER: mark gift as "thanked"
     ═══════════════════════════════════════════════════════════ */
  const markThanked = (registryId, giftId, thanked = true) => {
    const reg = registries.find(r => r.id === registryId);
    if (!reg) return;
    updateRegistry(registryId, {
      gifts: reg.gifts.map(g =>
        g.id === giftId
          ? { ...g, thanked, thankedAt: thanked ? new Date().toISOString() : null }
          : g
      ),
    });
  };

  /* ═══════════════════════════════════════════════════════════
     QUERIES
     ═══════════════════════════════════════════════════════════ */
  const getMyRegistry = () => {
    if (!user?.email) return null;
    return registries.find(r => r.ownerEmail === user.email.toLowerCase()) || null;
  };

  const getBySlug = (slug) =>
    registries.find(r => r.slug === slug) || null;

  const getById = (id) =>
    registries.find(r => r.id === id) || null;

  /* Computed stats for a registry */
  const getStats = (registryId) => {
    const reg = registries.find(r => r.id === registryId);
    if (!reg) return null;

    const totalItems = reg.items.length;
    const giftedItemIds = new Set(reg.gifts.map(g => g.itemId));
    const giftedCount = giftedItemIds.size;
    const remaining = totalItems - giftedCount;

    const totalValue = reg.items.reduce((sum, i) => sum + (i.price || 0), 0);
    const giftedValue = reg.items
      .filter(i => giftedItemIds.has(i.id))
      .reduce((sum, i) => sum + (i.price || 0), 0);
    const remainingValue = totalValue - giftedValue;

    const progress = totalItems === 0 ? 0 : Math.round((giftedCount / totalItems) * 100);

    const dueDate = reg.dueDate ? new Date(reg.dueDate) : null;
    const isPastDue = dueDate && dueDate < new Date();
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    /* Completion discount: 10% off remaining after due date */
    const completionDiscount = isPastDue && remaining > 0 ? 0.10 : 0;

    return {
      totalItems,
      giftedCount,
      remaining,
      totalValue,
      giftedValue,
      remainingValue,
      progress,
      isPastDue,
      daysUntilDue,
      completionDiscount,
    };
  };

  /* Is a specific product in my registry? */
  const isInMyRegistry = (productId) => {
    const reg = getMyRegistry();
    if (!reg) return false;
    return reg.items.some(i => i.productId === productId);
  };

  return (
    <RegistryContext.Provider value={{
      registries,
      createRegistry,
      updateRegistry,
      deleteRegistry,
      addItem,
      removeItem,
      updateItem,
      markGifted,
      unmarkGifted,
      markThanked,
      getMyRegistry,
      getBySlug,
      getById,
      getStats,
      isInMyRegistry,
    }}>
      {children}
    </RegistryContext.Provider>
  );
}