import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { registryService } from '../services/api';
import { useAuth } from './AuthContext';

const RegistryContext = createContext();
export const useRegistry = () => useContext(RegistryContext);

/* ═══════════════════════════════════════════════════════════
   REGISTRY PROVIDER (backend-first)
   ─────────────────────────────────────────────────────────
   - On login: fetch my registry via GET /registries/mine
   - Guest view: fetch via GET /registries/slug/:slug (cached)
   - Mutations: await the API, then patch local state
   - Guests can gift WITHOUT being logged in
   ═══════════════════════════════════════════════════════════ */
export function RegistryProvider({ children }) {
  const { user } = useAuth();

  /* My registry (null if none yet, or not logged in) */
  const [myRegistry, setMyRegistry] = useState(null);

  /* Guest-read cache: slug → registry object */
  const [bySlug, setBySlug] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ═══════════════════════════════════════════════════════════
     LOAD MY REGISTRY on login / logout
     ═══════════════════════════════════════════════════════════ */
  const reloadMine = useCallback(async () => {
    if (!user?.email) {
      setMyRegistry(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const reg = await registryService.mine();   // null if 404
      setMyRegistry(reg);
    } catch (err) {
      console.warn('[Registry] load mine failed:', err);
      setError(err?.message || 'Failed to load registry');
      setMyRegistry(null);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { reloadMine(); }, [reloadMine]);

  /* ═══════════════════════════════════════════════════════════
     CREATE
     ═══════════════════════════════════════════════════════════ */
  const createRegistry = async (data) => {
    if (!user?.email) return { ok: false, error: 'Sign in to create a registry' };
    if (!data.babyName?.trim()) return { ok: false, error: 'Baby name is required' };
    if (!data.dueDate) return { ok: false, error: 'Due date is required' };
    if (myRegistry) return { ok: false, error: 'You already have a registry. Edit it instead.' };

    try {
      const created = await registryService.create(data);
      setMyRegistry(created);
      return { ok: true, registry: created };
    } catch (err) {
      console.error('[Registry] create failed:', err);
      return { ok: false, error: err?.message || 'Failed to create registry' };
    }
  };

  /* ═══════════════════════════════════════════════════════════
     UPDATE (baby info, theme, message, etc.)
     ═══════════════════════════════════════════════════════════ */
  const updateRegistry = async (id, patch) => {
    try {
      const updated = await registryService.update(id, patch);
      if (myRegistry?.id === id) setMyRegistry(updated);
      return { ok: true, registry: updated };
    } catch (err) {
      console.error('[Registry] update failed:', err);
      return { ok: false, error: err?.message || 'Failed to update registry' };
    }
  };

  /* ═══════════════════════════════════════════════════════════
     DELETE
     ═══════════════════════════════════════════════════════════ */
  const deleteRegistry = async (id) => {
    try {
      await registryService.remove(id);
      if (myRegistry?.id === id) setMyRegistry(null);
      return { ok: true };
    } catch (err) {
      console.error('[Registry] delete failed:', err);
      return { ok: false, error: err?.message || 'Failed to delete registry' };
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ITEMS
     ═══════════════════════════════════════════════════════════ */
  const addItem = async (registryId, product, { priority = 'medium', note = '' } = {}) => {
    if (myRegistry?.items?.some(i => i.productId === product.id)) {
      return { ok: false, error: 'Already in your registry' };
    }
    try {
      const updated = await registryService.addItem(registryId, {
        productId: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        category: product.category,
        priority,
        note,
      });
      if (myRegistry?.id === registryId) setMyRegistry(updated);
      return { ok: true };
    } catch (err) {
      console.error('[Registry] addItem failed:', err);
      return { ok: false, error: err?.message || 'Failed to add item' };
    }
  };

  const removeItem = async (registryId, itemId) => {
    try {
      const updated = await registryService.removeItem(registryId, itemId);
      if (myRegistry?.id === registryId) setMyRegistry(updated);
      return { ok: true };
    } catch (err) {
      console.error('[Registry] removeItem failed:', err);
      return { ok: false, error: err?.message || 'Failed to remove item' };
    }
  };

  const updateItem = async (registryId, itemId, patch) => {
    // Only supports priority here (backend endpoint exists only for that)
    if (patch.priority !== undefined) {
      try {
        const updated = await registryService.updateItemPriority(
          registryId, itemId, patch.priority
        );
        if (myRegistry?.id === registryId) setMyRegistry(updated);
        return { ok: true };
      } catch (err) {
        console.error('[Registry] updateItem priority failed:', err);
        return { ok: false, error: err?.message || 'Failed to update item' };
      }
    }
    return { ok: false, error: 'Unsupported patch' };
  };

  /* ═══════════════════════════════════════════════════════════
     GIFTS (public — guest may not be logged in)
     ═══════════════════════════════════════════════════════════ */
  const markGifted = async (registryId, itemId, giftData) => {
    if (!giftData.giverName?.trim()) {
      return { ok: false, error: 'Your name is required' };
    }
    try {
      const updated = await registryService.markGifted(registryId, itemId, giftData);

      /* Update both caches: my registry (if owner viewing) AND bySlug (guest view) */
      if (myRegistry?.id === registryId) setMyRegistry(updated);
      setBySlug(prev => {
        const next = { ...prev };
        if (next[updated.slug]?.id === registryId) next[updated.slug] = updated;
        return next;
      });

      return { ok: true };
    } catch (err) {
      console.error('[Registry] markGifted failed:', err);
      return { ok: false, error: err?.message || 'Failed to register gift' };
    }
  };

  const unmarkGifted = async (registryId, giftId) => {
    try {
      const updated = await registryService.unmarkGifted(registryId, giftId);
      if (myRegistry?.id === registryId) setMyRegistry(updated);
      return { ok: true };
    } catch (err) {
      console.error('[Registry] unmarkGifted failed:', err);
      return { ok: false, error: err?.message || 'Failed to undo gift' };
    }
  };

  const markThanked = async (registryId, giftId, thanked = true) => {
    try {
      const updated = await registryService.markThanked(registryId, giftId, thanked);
      if (myRegistry?.id === registryId) setMyRegistry(updated);
      return { ok: true };
    } catch (err) {
      console.error('[Registry] markThanked failed:', err);
      return { ok: false, error: err?.message || 'Failed to update thanks' };
    }
  };

  /* ═══════════════════════════════════════════════════════════
     QUERIES
     ═══════════════════════════════════════════════════════════ */

  /** My registry, or null */
  const getMyRegistry = () => myRegistry;

  /** By slug — sync if cached, otherwise returns null and triggers fetch */
  const getBySlug = (slug) => bySlug[slug] || null;

  /** Async fetch — call this on mount of RegistryView */
    const fetchBySlug = useCallback(async (slug, options = {}) => {
    if (!slug) return null;
    
    // Look for the 'force' flag
    const force = options.force || false;

    // If we have it in cache AND we are not forcing a refresh, return the cache
    if (!force && bySlug[slug]) return bySlug[slug];

    try {
      const reg = await registryService.getBySlug(slug);
      if (reg) {
        setBySlug(prev => ({ ...prev, [slug]: reg }));
      }
      return reg;
    } catch (err) {
      console.error('[Registry] getBySlug failed:', err);
      return null;
    }
  }, [bySlug]);

  /** By id — only works for my registry right now (no public by-id endpoint) */
  const getById = (id) => {
    if (myRegistry?.id === id) return myRegistry;
    return Object.values(bySlug).find(r => r.id === id) || null;
  };

  /* Computed stats — sync, works off myRegistry OR any registry object you pass */
  const getStats = (registryId) => {
    const reg =
      myRegistry?.id === registryId
        ? myRegistry
        : Object.values(bySlug).find(r => r.id === registryId);

    if (!reg) return null;

    const totalItems = reg.items?.length || 0;
    const giftedItemIds = new Set((reg.gifts || []).map(g => g.itemId));
    const giftedCount = giftedItemIds.size;
    const remaining = totalItems - giftedCount;

    const totalValue = (reg.items || []).reduce((sum, i) => sum + (Number(i.price) || 0), 0);
    const giftedValue = (reg.items || [])
      .filter(i => giftedItemIds.has(i.id))
      .reduce((sum, i) => sum + (Number(i.price) || 0), 0);
    const remainingValue = totalValue - giftedValue;

    const progress = totalItems === 0 ? 0 : Math.round((giftedCount / totalItems) * 100);

    const dueDate = reg.dueDate ? new Date(reg.dueDate) : null;
    const isPastDue = dueDate ? dueDate < new Date() : false;
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
      : null;

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

  const isInMyRegistry = (productId) => {
    if (!myRegistry) return false;
    return (myRegistry.items || []).some(i => i.productId === productId);
  };

  /* ═══════════════════════════════════════════════════════════
     CONTEXT VALUE
     ═══════════════════════════════════════════════════════════ */
  return (
    <RegistryContext.Provider value={{
      /* State */
      myRegistry,
      loading,
      error,
      reloadMine,

      /* Mutations */
      createRegistry,
      updateRegistry,
      deleteRegistry,
      addItem,
      removeItem,
      updateItem,
      markGifted,
      unmarkGifted,
      markThanked,

      /* Queries */
      getMyRegistry,
      getBySlug,
      fetchBySlug,
      getById,
      getStats,
      isInMyRegistry,
    }}>
      {children}
    </RegistryContext.Provider>
  );
}