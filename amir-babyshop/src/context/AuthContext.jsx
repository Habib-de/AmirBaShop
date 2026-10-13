import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const USERS_KEY = 'amir_users';
const TENANTS_KEY = 'amir_tenants';

/* ─── Blank seed — register your first owner to start ─── */
const DEFAULT_USERS = [];
const DEFAULT_TENANTS = [];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('amir_user')) || null;
    } catch { return null; }
  });

  const [users, setUsers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(USERS_KEY));
      return Array.isArray(saved) ? saved : DEFAULT_USERS;
    } catch { return DEFAULT_USERS; }
  });

  const [tenants, setTenants] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TENANTS_KEY));
      return Array.isArray(saved) ? saved : DEFAULT_TENANTS;
    } catch { return DEFAULT_TENANTS; }
  });

  useEffect(() => {
    if (user) localStorage.setItem('amir_user', JSON.stringify(user));
    else localStorage.removeItem('amir_user');
  }, [user]);

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
  }, [tenants]);

  /* ─── LOGIN ─── */
  const login = (email, password) => {
    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { ok: false, error: 'Invalid email or password' };

    if (found.status === 'pending') {
      return {
        ok: false,
        error: '⏳ Your account is pending owner approval. Please wait to be activated.',
      };
    }
    if (found.status === 'rejected') {
      return {
        ok: false,
        error: '❌ Your registration was rejected. Please contact the shop owner.',
      };
    }

    const { password: _, ...safe } = found;
    setUser(safe);
    return { ok: true, user: safe };
  };

  /* ─── REGISTER — role-based ─── */
  const register = ({ name, email, password, role = 'customer', shopName, tenantId }) => {
    const cleanEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    let status = 'active';
    let finalTenantId = null;

    if (role === 'owner') {
      if (!shopName?.trim()) {
        return { ok: false, error: 'Shop name is required.' };
      }
      const slug = shopName.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20) || `shop-${Date.now().toString().slice(-4)}`;

      if (tenants.some(t => t.id === slug)) {
        return { ok: false, error: 'A shop with a similar name already exists.' };
      }

      setTenants(prev => [...prev, { id: slug, name: shopName.trim(), ownerEmail: cleanEmail }]);
      finalTenantId = slug;
      status = 'active';
    }

    else if (role === 'sales') {
      if (!tenantId) return { ok: false, error: 'Please choose the shop you want to join.' };
      if (!tenants.some(t => t.id === tenantId)) {
        return { ok: false, error: 'The selected shop does not exist.' };
      }
      finalTenantId = tenantId;
      status = 'pending';
    }

    else {
      if (!tenantId) return { ok: false, error: 'Please choose the shop you are shopping at.' };
      if (!tenants.some(t => t.id === tenantId)) {
        return { ok: false, error: 'The selected shop does not exist.' };
      }
      finalTenantId = tenantId;
      status = 'active';
    }

    const newUser = {
      id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name: name.trim(),
      email: cleanEmail,
      password,
      role,
      status,
      tenantId: finalTenantId,
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);

    return {
      ok: true,
      user: newUser,
      requiresApproval: status === 'pending',
    };
  };

  /* ─── OWNER: approve/reject pending staff ─── */
  const approveUser = (id) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: 'active', approvedAt: new Date().toISOString() } : u
    ));
  };

  const rejectUser = (id) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: 'rejected', rejectedAt: new Date().toISOString() } : u
    ));
  };

  const deleteUser = (id) => setUsers(prev => prev.filter(u => u.id !== id));

  /* ─── UPDATE USER (name, email, phone) ─── */
  const updateUser = (id, patch) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
    setUser(prev => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  /* ─── CHANGE PASSWORD ─── */
  const changePassword = (id, currentPassword, newPassword) => {
    const target = users.find(u => u.id === id);
    if (!target) return { ok: false, error: 'User not found' };

    if (target.password !== currentPassword) {
      return { ok: false, error: 'Current password is incorrect' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: 'New password must be at least 6 characters' };
    }
    if (newPassword === currentPassword) {
      return { ok: false, error: 'New password must be different' };
    }

    setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPassword } : u));
    return { ok: true };
  };

  /* ─── Helpers ─── */
  const getPendingUsers = (tenantId) =>
    users.filter(u => u.tenantId === tenantId && u.status === 'pending');

  const logout = () => setUser(null);

  const hasRole = (...roles) => user && roles.includes(user.role);
  const isOwner = user?.role === 'owner';
  const isSales = user?.role === 'sales';
  const isCustomer = user?.role === 'customer';
  const isStaff = isOwner || isSales;

  return (
    <AuthContext.Provider value={{
      user, users, tenants,
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