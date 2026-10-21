import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Menu, X, LogOut, LogIn, User, Heart,
  Bell, ChevronRight, Package, Star, Ticket, Info,
  Sun, Moon, Settings,
} from 'lucide-react';                                    // ← NEW: Settings icon
import { useEffect, useRef, useState } from 'react';
import Logo from '../UI/Logo';
import CurrencyToggle from '../UI/CurrencyToggle';
import CurrencyRatesModal from '../UI/CurrencyRatesModal'; // ← NEW
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useExtras } from '../../context/ExtrasContext';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { orderService } from '../../services/api';

const NOTIF_META = {
  order:   { icon: Package, color: 'text-blue-600',   bg: 'bg-blue-50' },
  review:  { icon: Star,    color: 'text-amber-600',  bg: 'bg-amber-50' },
  promo:   { icon: Ticket,  color: 'text-pink-600',   bg: 'bg-pink-50' },
  system:  { icon: Info,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
  info:    { icon: Info,    color: 'text-gray-600',   bg: 'bg-gray-50' },
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [notifMenu, setNotifMenu] = useState(false);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);   // ← NEW
  const [pendingOrders, setPendingOrders] = useState(0);

  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, logout, isStaff, isOwner } = useAuth();
  const { getUnreadNotifCount, getMyNotifs, markNotifRead } = useExtras();
  const { isDark, toggleTheme } = useTheme();
  const { currency } = useCurrency();

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const unreadCount = user ? getUnreadNotifCount(user.email) : 0;
  const recentNotifs = user ? getMyNotifs(user.email).slice(0, 5) : [];

  const showWishlist = !isStaff;

  useEffect(() => {
  const handler = (e) => {
    if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
      const inPortal = e.target.closest('[data-currency-portal]');
      if (!inPortal) setUserMenu(false);
    }
    if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) setNotifMenu(false);
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, []);

  useEffect(() => {
    setUserMenu(false);
    setNotifMenu(false);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
  if (!isStaff || !user) { setPendingOrders(0); return; }
  let cancelled = false;
  const load = async () => {
    try {
      const count = await orderService.pendingCount();
      if (!cancelled) setPendingOrders(Number(count) || 0);
    } catch { /* silent */ }
  };
  load();
  const id = setInterval(() => {
    if (document.visibilityState === 'visible') load();
  }, 30000);
  return () => { cancelled = true; clearInterval(id); };
}, [isStaff, user, pathname]);

  const navLinks = [
    { to: '/',          label: 'Home' },
    { to: '/shop',      label: 'Shop' },
    ...((!isStaff && !user) ? [{ to: '/track',     label: 'Track Order' }] : []),
    ...(!isStaff && user ? [{ to: '/my-orders', label: 'My Orders' }] : []),
    ...(isStaff ? [{ to: '/orders', label: 'Orders', badge: pendingOrders }] : []),
    ...(!isStaff && user ? [{ to: '/returns', label: 'My Returns' }] : []),
    ...(isStaff ? [{ to: '/inventory', label: 'Inventory' }] : []),
    ...(isOwner ? [{ to: '/team',       label: 'Team' }] : []),
    { to: '/contact',   label: isStaff ? 'Feedback' : 'Contact' },
  ];

  const roleBadge = {
    owner:    { label: 'Owner',    cls: 'bg-amir-purple/60 text-amir-dark' },
    sales:    { label: 'Sales',    cls: 'bg-amir-mint text-emerald-900' },
    customer: { label: 'Customer', cls: 'bg-amir-pink/60 text-amir-dark' },
  };

  const handleLogout = () => {
    setUserMenu(false);
    setNotifMenu(false);
    setOpen(false);
    logout();
    navigate('/login');
  };

  /* ─── Staff click the currency row → open rate modal instead of toggling ─── */
  // const handleCurrencyClick = () => {              // ← NEW
  //   if (isStaff) {
  //     setUserMenu(false);
  //     setRatesModalOpen(true);
  //   } else {
  //     toggleCurrency();
  //   }
  // };

  const relTime = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Left: hamburger + logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="btn-icon w-10 h-10 hover:bg-amir-pink/20 md:hidden"
                onClick={() => setOpen(!open)}
                aria-label="Toggle menu"
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>

              <Logo />
            </div>

            {/* Center: desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
  {navLinks.map(l => (
    <Link
      key={l.to}
      to={l.to}
      className={`px-4 py-2 rounded-full text-sm font-bold transition-colors inline-flex items-center gap-1.5 ${
        pathname === l.to ? 'bg-amir-pink text-amir-dark' : 'text-amir-dark/70 hover:bg-amir-pink/30'
      }`}
    >
      {l.label}
      {l.badge > 0 && (
        <span className="bg-amber-500 text-white text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
          {l.badge > 99 ? '99+' : l.badge}
        </span>
      )}
    </Link>
  ))}
</nav>

            {/* Right: bell + wishlist + cart + avatar */}
            <div className="flex items-center gap-0.5 sm:gap-1">

              {/* 🔔 Notifications */}
              {user && (
                <div className="relative" ref={notifMenuRef}>
                  <button
                    onClick={() => setNotifMenu(!notifMenu)}
                    className="btn-icon w-10 h-10 sm:w-11 sm:h-11 hover:bg-amber-50 relative"
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    <Bell size={18} className="sm:hidden" />
                    <Bell size={20} className="hidden sm:block" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-amber-500 text-white text-[9px] sm:text-[10px] font-extrabold rounded-full min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifMenu && (
                   <div className="fixed inset-x-2 top-14 sm:absolute sm:right-0 sm:top-full sm:inset-x-auto sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-xl border border-amir-dark/5 overflow-hidden animate-fade-in z-50 max-h-[75vh] flex flex-col">
                      <div className="flex items-center justify-between p-3 border-b border-amir-dark/5">
                        <p className="font-black text-sm">Notifications</p>
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        {recentNotifs.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell size={28} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-xs font-bold text-gray-600">No notifications yet</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              We'll let you know when something happens
                            </p>
                          </div>
                        ) : (
                          recentNotifs.map(n => {
                            const meta = NOTIF_META[n.type] || NOTIF_META.info;
                            const Icon = meta.icon;
                            const Wrapper = n.link ? Link : 'div';
                            const wrapperProps = n.link
                              ? {
                                  to: n.link,
                                  onClick: () => {
                                    markNotifRead(n.id);
                                    setNotifMenu(false);
                                  },
                                }
                              : {};

                            return (
                              <Wrapper
                                key={n.id}
                                {...wrapperProps}
                                className={`flex items-start gap-2.5 p-3 border-b border-amir-dark/5 last:border-b-0 transition-colors ${
                                  !n.read ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'
                                } ${n.link ? 'cursor-pointer' : ''}`}
                              >
                                <div className={`w-8 h-8 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                                  <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs leading-tight truncate ${
                                    !n.read ? 'font-black text-amir-dark' : 'font-semibold text-amir-dark/80'
                                  }`}>
                                    {n.title}
                                  </p>
                                  {n.body && (
                                    <p className="text-[10px] text-amir-dark/50 line-clamp-1 mt-0.5">
                                      {n.body}
                                    </p>
                                  )}
                                </div>
                                <span className="text-[9px] text-amir-dark/40 font-semibold shrink-0">
                                  {relTime(n.createdAt)}
                                </span>
                              </Wrapper>
                            );
                          })
                        )}
                      </div>

                      <Link
                        to="/notifications"
                        onClick={() => setNotifMenu(false)}
                        className="flex items-center justify-center gap-1 p-3 border-t border-amir-dark/5 text-xs font-bold text-amir-dark hover:bg-amir-pink/20 transition-colors"
                      >
                        View all notifications <ChevronRight size={12} />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* ❤️ Wishlist — customers only */}
              {showWishlist && (
                <Link
                  to="/wishlist"
                  className="btn-icon w-10 h-10 sm:w-11 sm:h-11 hover:bg-rose-50 relative"
                  aria-label="Wishlist"
                  title="Wishlist"
                >
                  <Heart size={18} className="sm:hidden" />
                  <Heart size={20} className="hidden sm:block" />
                  {wishlistCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white text-[9px] sm:text-[10px] font-extrabold rounded-full min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-1">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* 💱 Currency pill for logged-in customers */}
{/* {user && !isStaff && <CurrencyToggle variant="pill" />} */}

              {/* 🛒 Cart */}
              <Link to="/cart" className="btn-icon w-10 h-10 sm:w-11 sm:h-11 hover:bg-amir-pink/20 relative">
                <ShoppingCart size={18} className="sm:hidden" />
                <ShoppingCart size={20} className="hidden sm:block" />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-amir-pink text-amir-dark text-[9px] sm:text-[10px] font-extrabold rounded-full min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenu(!userMenu)}
                    className="btn-icon w-10 h-10 sm:w-11 sm:h-11 bg-amir-pink/30 hover:bg-amir-pink/50"
                    aria-label="Account menu"
                  >
                    <span className="font-black text-xs sm:text-sm text-amir-dark">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </button>

                  {userMenu && (
                    <div className="absolute right-0 top-full mt-2 w-60 sm:w-64 bg-white rounded-2xl shadow-xl border border-amir-dark/5 overflow-hidden animate-fade-in z-50">
                      <div className="p-4 border-b border-amir-dark/5">
                        <p className="font-black text-sm leading-tight">{user.name}</p>
                        <p className="text-xs text-amir-dark/60 truncate">{user.email}</p>
                        <span className={`badge mt-2 ${roleBadge[user.role]?.cls}`}>
                          {roleBadge[user.role]?.label}
                        </span>
                      </div>

                      <div className="p-2">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amir-pink/20 font-bold text-sm"
                        >
                          <User size={16} /> My Profile
                        </Link>

                        {showWishlist && (
                          <Link
                            to="/wishlist"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 font-bold text-sm"
                          >
                            <Heart size={16} /> My Wishlist
                            {wishlistCount > 0 && (
                              <span className="ml-auto bg-rose-500 text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                                {wishlistCount}
                              </span>
                            )}
                          </Link>
                        )}

                        <Link
                          to="/notifications"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 font-bold text-sm"
                        >
                          <Bell size={16} /> Notifications
                          {unreadCount > 0 && (
                            <span className="ml-auto bg-amber-500 text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                              {unreadCount}
                            </span>
                          )}
                        </Link>

                        {/* 💱 Staff: opens rate editor. Customers: opens picker modal. */}
{isStaff ? (
  <button
    onClick={() => { setUserMenu(false); setRatesModalOpen(true); }}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amir-pink/20 font-bold text-sm transition-colors"
  >
    <Settings size={16} /> {currency}
    <span className="ml-auto text-[10px] text-amir-dark/50 font-semibold">edit rates</span>
  </button>
) : (
  <div className="px-1">
    <CurrencyToggle variant="row" />
  </div>
)}

                        {/* 🌙 Dark mode toggle */}
                        <button
                          onClick={toggleTheme}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 font-bold text-sm transition-colors"
                        >
                          {isDark ? <Sun size={16} /> : <Moon size={16} />}
                          {isDark ? 'Light mode' : 'Dark mode'}
                        </button>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-sm transition-colors"
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* 💱 Currency toggle (guest) — desktop */}
                  <CurrencyToggle variant="pill" />

                  {/* 🌙 Dark mode toggle for guests (no login) */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="btn-icon w-10 h-10 sm:w-11 sm:h-11 hover:bg-amir-pink/20"
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={isDark ? 'Light mode' : 'Dark mode'}
                  >
                    {isDark ? (
                      <>
                        <Sun size={18} className="sm:hidden" />
                        <Sun size={20} className="hidden sm:block" />
                      </>
                    ) : (
                      <>
                        <Moon size={18} className="sm:hidden" />
                        <Moon size={20} className="hidden sm:block" />
                      </>
                    )}
                  </button>

                  <Link
                    to="/login"
                    className="hidden sm:inline-flex btn-icon w-11 h-11 hover:bg-amir-pink/20"
                    aria-label="Sign in"
                  >
                    <LogIn size={20} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-amir-dark/5">
              <Logo />
              <button className="btn-icon hover:bg-amir-pink/20" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navLinks.map(l => (
  <Link
    key={l.to}
    to={l.to}
    onClick={() => setOpen(false)}
    className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold ${
      pathname === l.to ? 'bg-amir-pink/40' : 'hover:bg-amir-pink/20'
    }`}
  >
    <span>{l.label}</span>
    {l.badge > 0 && (
      <span className="bg-amber-500 text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
        {l.badge > 99 ? '99+' : l.badge}
      </span>
    )}
  </Link>
))}

              <div className="border-t border-amir-dark/5 pt-3 mt-3">
                {user ? (
                  <>
                    <Link
                      to="/notifications"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-amber-50 font-bold"
                    >
                      <Bell size={16} /> Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-amber-500 text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      to="/cart"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-amir-pink/20 font-bold"
                    >
                      <ShoppingCart size={16} /> My cart
                      {cartCount > 0 && (
                        <span className="ml-auto bg-amir-pink text-amir-dark text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {cartCount}
                        </span>
                      )}
                    </Link>

                    {showWishlist && (
                      <Link
                        to="/wishlist"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-50 font-bold"
                      >
                        <Heart size={16} /> My wishlist
                        {wishlistCount > 0 && (
                          <span className="ml-auto bg-rose-500 text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>
                    )}

                    {/* 💱 Currency row — staff opens rate editor, customers get the picker modal */}
{isStaff ? (
  <button
    onClick={() => { setOpen(false); setRatesModalOpen(true); }}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-amir-pink/20 font-bold"
  >
    <Settings size={16} /> {currency}
    <span className="ml-auto text-[10px] text-amir-dark/50 font-semibold">edit rates</span>
  </button>
) : (
  <CurrencyToggle variant="row" />
)}

                    {/* 🌙 Theme toggle in mobile drawer (logged in) */}
                    <button
                      onClick={() => {
                        toggleTheme();
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-100 font-bold"
                    >
                      {isDark ? <Sun size={16} /> : <Moon size={16} />}
                      {isDark ? 'Light mode' : 'Dark mode'}
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-50 text-rose-600 font-bold text-sm"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/wishlist"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-50 font-bold"
                    >
                      <Heart size={16} /> My wishlist
                      {wishlistCount > 0 && (
                        <span className="ml-auto bg-rose-500 text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      to="/cart"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-amir-pink/20 font-bold"
                    >
                      <ShoppingCart size={16} /> My cart
                      {cartCount > 0 && (
                        <span className="ml-auto bg-amir-pink text-amir-dark text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {cartCount}
                        </span>
                      )}
                    </Link>

                    {/* 💱 Currency toggle (mobile drawer, guest) */}
                    <CurrencyToggle variant="row" />

                    {/* 🌙 Theme toggle in mobile drawer (guest) */}
                    <button
                      onClick={() => {
                        toggleTheme();
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-100 font-bold"
                    >
                      {isDark ? <Sun size={16} /> : <Moon size={16} />}
                      {isDark ? 'Light mode' : 'Dark mode'}
                    </button>

                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amir-pink/30 font-bold"
                    >
                      <LogIn size={16} /> Sign in
                    </Link>
                  </>
                )}
              </div>
            </nav>

            <div className="p-4 border-t border-amir-dark/5 text-xs text-amir-dark/60 font-semibold">
              © {new Date().getFullYear()} AMIR BabyShop
            </div>
          </div>
        </div>
      )}

      {/* 💱 Staff rate editor modal — NEW */}
      <CurrencyRatesModal
        open={ratesModalOpen}
        onClose={() => setRatesModalOpen(false)}
      />
    </>
  );
}