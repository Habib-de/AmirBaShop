import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { tokenStore } from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const SESSION_KEY = 'amir_user';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/* ─── Safe read of cached user ─── */
const readCachedUser = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
  catch { return null; }
};

/* ═══════════════════════════════════════════════════════════
   LOW-LEVEL FETCH (only used here for the 3 auth endpoints)
   — Kept inline to avoid a circular import with services/api.js
   ═══════════════════════════════════════════════════════════ */
async function callApi(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && tokenStore.access) {
    headers['Authorization'] = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try { payload = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const err = new Error(payload?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = payload?.errors;
    throw err;
  }

  return payload?.data ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);
  const [bootstrapping, setBootstrapping] = useState(true);

  /* ─── Persist user to localStorage ─── */
  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }, [user]);

  /* ─── On mount: verify token with backend ─── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!tokenStore.access) {
        setBootstrapping(false);
        return;
      }
      try {
        const fresh = await callApi('/auth/me', { auth: true });
        if (!cancelled) setUser(fresh);
      } catch {
        if (!cancelled) {
          tokenStore.clear();
          setUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ═══ LOGIN ═══ */
  const login = useCallback(async (email, password) => {
    try {
      const res = await callApi('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      tokenStore.set(res.accessToken, res.refreshToken);
      setUser(res.user);
      return { ok: true, user: res.user };
    } catch (err) {
      return { ok: false, error: err.message || 'Login failed' };
    }
  }, []);

  /* ═══ REGISTER ═══ */
  const register = useCallback(async ({ name, email, password, role = 'customer', shopName, tenantId }) => {
    try {
      const res = await callApi('/auth/register', {
        method: 'POST',
        body: { name, email, password, role, shopName, tenantId },
      });

      // Pending accounts get no token — user must wait for approval
      if (!res.requiresApproval) {
        tokenStore.set(res.accessToken, res.refreshToken);
        setUser(res.user);
      }

      return {
        ok: true,
        user: res.user,
        requiresApproval: res.requiresApproval,
      };
    } catch (err) {
      return { ok: false, error: err.message || 'Registration failed' };
    }
  }, []);

  /* ═══ LOGOUT ═══ */
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  /* ═══ UPDATE PROFILE ═══ */
  const updateUser = useCallback(async (_id, patch) => {
    try {
      const fresh = await callApi('/users/me', { method: 'PATCH', body: patch, auth: true });
      setUser(fresh);
      return { ok: true, user: fresh };
    } catch (err) {
      return { ok: false, error: err.message || 'Update failed' };
    }
  }, []);

  /* ═══ CHANGE PASSWORD ═══ */
  const changePassword = useCallback(async (_id, currentPassword, newPassword) => {
    try {
      await callApi('/users/me/password', {
        method: 'POST',
        body: { currentPassword, newPassword },
        auth: true,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Password change failed' };
    }
  }, []);

  /* ═══ Legacy stubs — kept so Team.jsx etc. still compile ═══ */
  const approveUser = useCallback(() => {}, []);
  const rejectUser = useCallback(() => {}, []);
  const deleteUser = useCallback(() => {}, []);
  const getPendingUsers = useCallback(() => [], []);

  /* ═══ Derived helpers ═══ */
  const hasRole = (...roles) => user && roles.includes(user.role);
  const isOwner = user?.role === 'owner';
  const isSales = user?.role === 'sales';
  const isCustomer = user?.role === 'customer';
  const isStaff = isOwner || isSales;

  return (
    <AuthContext.Provider value={{
      user,
      bootstrapping,
      users: [],       // Phase 3 fills this via /api/team
      tenants: [],     // Phase 3 fills this via /api/tenants
      login, register, logout,
      approveUser, rejectUser, deleteUser,
      updateUser, changePassword,
      getPendingUsers,
      hasRole, isOwner, isSales, isCustomer, isStaff,
    }}>
      {children}
    </AuthContext.Provider>
  );
}