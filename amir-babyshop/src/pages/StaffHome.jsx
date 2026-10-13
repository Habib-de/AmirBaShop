import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Inbox, AlertTriangle, TrendingUp, ShoppingBag,
  ChevronRight, Truck, CheckCircle2, Clock, RefreshCw,
  DollarSign, Bell, Star, MessageSquare, UserCheck, Users,
  Ticket, Plus, RotateCcw,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useOrders } from '../context/OrderContext';
import { useFeedback } from '../context/FeedbackContext';
import { useReviews } from '../context/ReviewsContext';
import { useAuth } from '../context/AuthContext';
import { useExtras } from '../context/ExtrasContext';
import { formatCurrency } from '../utils/format';
import Skeleton from '../components/UI/Skeleton';
import { useDelayedReady } from '../hooks/useDelayedReady';

export default function StaffHome() {
  const { products, lowStock, outOfStock, totalValue } = useInventory();
  const { counts: orderCounts, revenue, orders } = useOrders();
  const { counts: feedbackCounts, messages } = useFeedback();
  const { reviews, getStats } = useReviews();
  const { coupons, returnCounts } = useExtras();
  const { user, isOwner, users, tenants } = useAuth();

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const ready = useDelayedReady(400);

  const handleRefresh = () => {
    setRefreshing(true);
    setLastUpdated(new Date());
    setTimeout(() => setRefreshing(false), 400);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.name?.split(' ')[0] || 'there';
  const myTenantId = user?.tenantId;
  const myTenant = tenants.find(t => t.id === myTenantId);

  /* ── Pending team (owner only view) ── */
  const pendingTeam = useMemo(
    () => users.filter(u => u.tenantId === myTenantId && u.status === 'pending'),
    [users, myTenantId]
  );

  /* ── Coupon stats ── */
  const couponStats = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const active = coupons.filter(c =>
      c.active && (!c.expiresAt || new Date(c.expiresAt).getTime() > now)
    );
    const expiringSoon = active.filter(c =>
      c.expiresAt && new Date(c.expiresAt).getTime() <= weekFromNow
    );
    const totalUses = coupons.reduce((sum, c) => sum + (c.uses || 0), 0);
    return { active, expiringSoon, total: coupons.length, totalUses };
  }, [coupons]);

  /* ── Average rating across all products ── */
  const avgRating = useMemo(() => {
    if (!products.length) return '0.0';
    let totalReviews = 0;
    let totalStars = 0;
    products.forEach(p => {
      const s = getStats(p.id);
      totalReviews += s.count;
      totalStars += s.avg * s.count;
    });
    if (totalReviews === 0) {
      const seed = products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length;
      return seed.toFixed(1);
    }
    return (totalStars / totalReviews).toFixed(1);
  }, [products, getStats]);

  /* ── KPIs ── */
  const kpis = [
    {
      label: 'Pending Orders',
      value: orderCounts.pending,
      sub: `${orderCounts.confirmed} confirmed`,
      icon: Clock,
      color: 'amber',
      to: '/orders',
    },
    {
      label: 'Revenue',
      value: formatCurrency(revenue || 0),
      sub: 'Completed orders',
      icon: DollarSign,
      color: 'blue',
      to: '/orders',
    },
    {
      label: 'Reviews',
      value: reviews.length,
      sub: `Avg ${avgRating} ★`,
      icon: Star,
      color: 'amber',
      to: '/shop',
    },
    isOwner
      ? {
          label: 'Active Coupons',
          value: couponStats.active.length,
          sub: `${couponStats.totalUses} uses total`,
          icon: Ticket,
          color: 'pink',
          to: '/coupons',
        }
      : {
          label: 'Messages',
          value: feedbackCounts.unread,
          sub: `${feedbackCounts.total} total`,
          icon: Inbox,
          color: 'indigo',
          to: '/contact',
        },
  ];

  /* ── Needs attention ── */
  const actions = [
    orderCounts.pending > 0 && {
      icon: Clock,
      title: `${orderCounts.pending} pending order${orderCounts.pending !== 1 ? 's' : ''}`,
      sub: 'Waiting to be confirmed',
      to: '/orders',
      color: 'amber',
    },
    // 🆕 RETURNS — show when there are pending return requests
  returnCounts?.pending > 0 && {
    icon: RotateCcw,
    title: `${returnCounts.pending} pending return${returnCounts.pending !== 1 ? 's' : ''}`,
    sub: 'Waiting for your review',
    to: '/staff/returns',
    color: 'rose',
  },
    feedbackCounts.unread > 0 && {
      icon: Inbox,
      title: `${feedbackCounts.unread} new message${feedbackCounts.unread !== 1 ? 's' : ''}`,
      sub: 'From customers and guests',
      to: '/contact',
      color: 'blue',
    },
    lowStock.length > 0 && {
      icon: AlertTriangle,
      title: `${lowStock.length} low-stock item${lowStock.length !== 1 ? 's' : ''}`,
      sub: 'Restock soon',
      to: '/inventory',
      color: 'rose',
    },
    outOfStock.length > 0 && {
      icon: AlertTriangle,
      title: `${outOfStock.length} out-of-stock item${outOfStock.length !== 1 ? 's' : ''}`,
      sub: 'Customers can\'t buy these',
      to: '/inventory',
      color: 'rose',
    },
    isOwner && pendingTeam.length > 0 && {
      icon: UserCheck,
      title: `${pendingTeam.length} team member${pendingTeam.length !== 1 ? 's' : ''} awaiting approval`,
      sub: 'Review registrations',
      to: '/team',
      color: 'purple',
    },
    isOwner && couponStats.expiringSoon.length > 0 && {
      icon: Ticket,
      title: `${couponStats.expiringSoon.length} coupon${couponStats.expiringSoon.length !== 1 ? 's' : ''} expiring soon`,
      sub: 'Within the next 7 days',
      to: '/coupons',
      color: 'pink',
    },
  ].filter(Boolean);

  const recentOrders = [...orders].slice(0, 5);
  const topProducts = [...products].sort((a, b) => b.stock - a.stock).slice(0, 5);

  /* ── Latest reviews ── */
  const latestReviews = useMemo(() => {
    return [...reviews]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
      .map(r => ({
        ...r,
        product: products.find(p => p.id === r.productId),
      }));
  }, [reviews, products]);

  /* ── Activity feed ── */
  const activity = useMemo(() => {
    const items = [];

    [...orders].slice(0, 3).forEach(o => {
      items.push({
        id: `o-${o.id}`,
        icon: Package,
        color: 'blue',
        title: `${o.customer?.name || 'Guest'} placed an order`,
        sub: `${o.items?.length || 0} item${o.items?.length !== 1 ? 's' : ''} · ${formatCurrency(o.total || 0)}`,
        when: o.createdAt,
        to: '/orders',
      });
    });

    [...reviews].slice(0, 3).forEach(r => {
      const product = products.find(p => p.id === r.productId);
      items.push({
        id: `r-${r.id}`,
        icon: Star,
        color: 'amber',
        title: `${r.authorName} left a ${r.rating}★ review`,
        sub: product?.name || 'Unknown product',
        when: r.createdAt,
        to: `/product/${r.productId}`,
      });
    });

    [...messages].slice(0, 2).forEach(m => {
      items.push({
        id: `f-${m.id}`,
        icon: MessageSquare,
        color: 'indigo',
        title: `${m.name || 'Guest'} sent a message`,
        sub: m.subject,
        when: m.createdAt,
        to: '/contact',
      });
    });

    return items
      .filter(i => i.when)
      .sort((a, b) => new Date(b.when) - new Date(a.when))
      .slice(0, 6);
  }, [orders, reviews, messages, products]);

  const relTime = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  const colorMap = {
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-200'  },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200'   },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   border: 'border-rose-200'   },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-200'  },
    pink:   { bg: 'bg-pink-50',   text: 'text-pink-600',   border: 'border-pink-200'   },
    emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-600',border: 'border-emerald-200'},
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">

      {/* ═══ GRADIENT WELCOME BANNER ═══ */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amir-pink/70 via-amir-purple/40 to-amir-blue/70 p-5 sm:p-8 shadow-sm">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/25 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-black text-amir-dark leading-tight">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-amir-dark/70 font-semibold mt-1">
              {myTenant?.name ? `${myTenant.name} · ` : ''}
              {actions.length > 0
                ? `${actions.length} item${actions.length !== 1 ? 's' : ''} need${actions.length === 1 ? 's' : ''} your attention`
                : 'All caught up — nice work'}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-amir-dark/60 font-semibold">
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRefresh}
                className="w-9 h-9 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-amir-dark transition-colors"
                title="Refresh"
                aria-label="Refresh"
              >
                <RefreshCw size={16} className={`transition-transform duration-500 ${refreshing ? 'rotate-180' : ''}`} />
              </button>
              <Link
                to="/contact"
                className="relative w-9 h-9 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-amir-dark transition-colors"
                title="Messages"
                aria-label="Messages"
              >
                <Bell size={16} />
                {feedbackCounts.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-black">
                    {feedbackCounts.unread > 9 ? '9+' : feedbackCounts.unread}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 4 KPI CARDS ═══ */}
      {!ready ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.KpiCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((k, i) => {
            const c = colorMap[k.color];
            const Icon = k.icon;
            return (
              <Link
                key={i}
                to={k.to}
                className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-amir-pink transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold truncate">
                      {k.label}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate text-gray-900">
                      {k.value}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">
                      {k.sub}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${c.bg} ${c.text} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon size={16} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══ NEEDS ATTENTION ═══ */}
      {!ready ? (
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200">
          <Skeleton.List count={3} />
        </div>
      ) : actions.length > 0 ? (
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-gray-900">
              <AlertTriangle size={16} className="text-rose-500" />
              Needs Your Attention
            </h3>
            <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">
              {actions.length}
            </span>
          </div>

          <div className="space-y-2">
            {actions.map((a, i) => {
              const c = colorMap[a.color];
              const Icon = a.icon;
              return (
                <Link
                  key={i}
                  to={a.to}
                  className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border-l-4 ${c.border} ${c.bg} hover:shadow-md transition-all`}
                >
                  <span className={`w-9 h-9 rounded-lg bg-white ${c.text} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-800 leading-tight truncate">
                      {a.title}
                    </span>
                    <span className="block text-[11px] text-gray-500 truncate">
                      {a.sub}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ═══ RECENT ACTIVITY + LATEST REVIEWS ═══ */}
      {!ready ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200">
            <Skeleton.List count={4} />
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200">
            <Skeleton.List count={4} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent Activity */}
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-gray-900">
                <TrendingUp size={16} className="text-blue-500" />
                Recent Activity
              </h3>
            </div>

            {activity.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <TrendingUp size={32} className="mx-auto text-gray-300 mb-2" />
                <p>No activity yet</p>
                <p className="text-[11px] mt-0.5">Orders, reviews, and messages will show up here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activity.map(a => {
                  const c = colorMap[a.color];
                  const Icon = a.icon;
                  return (
                    <Link
                      key={a.id}
                      to={a.to}
                      className="flex items-center gap-3 py-2.5 hover:bg-gray-50 rounded-lg px-1 transition-colors"
                    >
                      <span className={`w-8 h-8 rounded-lg ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 leading-tight truncate">
                          {a.title}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">{a.sub}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {relTime(a.when)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Latest Reviews */}
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-gray-900">
                <Star size={16} className="text-amber-500" />
                Latest Reviews
              </h3>
              <span className="text-[10px] text-gray-500 font-semibold">
                {reviews.length} total
              </span>
            </div>

            {latestReviews.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Star size={32} className="mx-auto text-gray-300 mb-2" />
                <p>No reviews yet</p>
                <p className="text-[11px] mt-0.5">Customer reviews will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {latestReviews.map(r => (
                  <Link
                    key={r.id}
                    to={`/product/${r.productId}`}
                    className="block p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <div className="flex shrink-0">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span
                            key={i}
                            className={`text-sm leading-none ${i <= r.rating ? 'text-amber-400' : 'text-gray-300'}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-auto">
                        {relTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {r.authorName}
                      {r.verified && <span className="text-emerald-600 ml-1">✅</span>}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {r.product?.name || 'Unknown product'}
                    </p>
                    {r.comment && (
                      <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                        "{r.comment}"
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🆕 Returns Quick Link */}
<div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
        <RotateCcw size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-gray-900">Returns</p>
        <p className="text-[11px] text-gray-500">
          {returnCounts?.total > 0
            ? `${returnCounts.total} total · ${returnCounts.pending} pending`
            : 'Manage customer returns'}
        </p>
      </div>
    </div>
    <Link
      to="/staff/returns"
      className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
    >
      Manage <ChevronRight size={12} />
    </Link>
  </div>
</div>

      {/* ═══ RECENT ORDERS + TOP PRODUCTS ═══ */}
      {!ready ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200">
            <Skeleton.List count={4} />
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200">
            <Skeleton.List count={4} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent Orders */}
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-gray-900">
                <Package size={16} className="text-blue-500" />
                Recent Orders
              </h3>
              <Link
                to="/orders"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                View All <ChevronRight size={12} />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Package size={32} className="mx-auto text-gray-300 mb-2" />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentOrders.map((o) => {
                  const statusMeta = {
                    pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700' },
                    confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-700' },
                    fulfilled: { label: 'Fulfilled', cls: 'bg-green-100 text-green-700' },
                    cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
                  }[o.status] || { label: 'Pending', cls: 'bg-gray-100 text-gray-700' };

                  return (
                    <Link
                      key={o.id}
                      to="/orders"
                      className="flex items-center gap-3 py-2.5 hover:bg-gray-50 rounded-lg px-1 transition-colors"
                    >
                      {o.items?.[0]?.image && (
                        <img
                          src={o.items[0].image}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-100"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono font-bold text-gray-800 truncate">{o.id}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {o.customer?.name || 'Guest'} · {o.items?.length || 0} item{o.items?.length !== 1 && 's'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-gray-800">
                          {formatCurrency(o.total || 0)}
                        </p>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold mt-0.5 ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-gray-900">
                <ShoppingBag size={16} className="text-purple-500" />
                Top Stock Products
              </h3>
              <Link
                to="/inventory"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                View All <ChevronRight size={12} />
              </Link>
            </div>

            {topProducts.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" />
                <p>No products yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topProducts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-gray-50 rounded-lg px-1 transition-colors"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-100"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {p.sku} · {p.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-800">{p.stock} in stock</p>
                      <p className="text-[10px] text-gray-500">{formatCurrency(p.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ OWNER-ONLY: Coupons + Inventory + Order Breakdown ═══ */}
      {isOwner && (
        !ready ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200">
              <Skeleton.Text lines={5} />
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200">
              <Skeleton.Text lines={5} />
            </div>
          </div>
        ) : (
          <>
            {/* Coupons Widget (owner only) */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-gray-900">
                  <Ticket size={16} className="text-pink-500" />
                  Coupons
                </h3>
                <Link
                  to="/coupons"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Manage <ChevronRight size={12} />
                </Link>
              </div>

              {couponStats.active.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <Ticket size={32} className="mx-auto text-gray-300 mb-2" />
                  <p>No active coupons</p>
                  <Link
                    to="/coupons"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-pink-600 font-bold hover:underline"
                  >
                    <Plus size={12} /> Create your first coupon
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {couponStats.active.slice(0, 4).map(c => {
                    const valueText =
                      c.type === 'percent'  ? `${c.value}% off` :
                      c.type === 'fixed'    ? `${formatCurrency(c.value)} off` :
                      'Free shipping';
                    return (
                      <Link
                        key={c.id}
                        to="/coupons"
                        className="flex items-center gap-3 py-2.5 hover:bg-gray-50 rounded-lg px-1 transition-colors"
                      >
                        <span className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                          <Ticket size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono font-bold text-gray-800 truncate">{c.code}</p>
                          <p className="text-[10px] text-gray-500 truncate">{valueText}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-gray-800">
                            {c.uses || 0} use{c.uses !== 1 ? 's' : ''}
                          </p>
                          {c.expiresAt && (
                            <p className="text-[10px] text-gray-500">
                              Exp {new Date(c.expiresAt).toLocaleDateString([], {
                                month: 'short', day: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {couponStats.active.length > 4 && (
                    <Link
                      to="/coupons"
                      className="block text-center py-2 text-xs font-bold text-pink-600 hover:underline"
                    >
                      View all {couponStats.active.length} active coupons →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Inventory + Order Breakdown row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base mb-3 text-gray-900">
                  <DollarSign size={16} className="text-emerald-500" />
                  Inventory Value
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total stock value</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(totalValue || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total products</span>
                    <span className="text-sm font-bold text-gray-900">{products.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Out of stock</span>
                    <span className="text-sm font-bold text-rose-600">{outOfStock.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Low stock</span>
                    <span className="text-sm font-bold text-amber-600">{lowStock.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base mb-3 text-gray-900">
                  <TrendingUp size={16} className="text-blue-500" />
                  Order Status Breakdown
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Pending',   value: orderCounts.pending,   color: 'bg-amber-500' },
                    { label: 'Confirmed', value: orderCounts.confirmed, color: 'bg-blue-500' },
                    { label: 'Fulfilled', value: orderCounts.fulfilled, color: 'bg-green-500' },
                    { label: 'Cancelled', value: orderCounts.cancelled, color: 'bg-rose-500' },
                  ].map((row, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-semibold">{row.label}</span>
                        <span className="font-bold text-gray-900">{row.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${row.color}`}
                          style={{ width: `${Math.min(100, (row.value / Math.max(1, orderCounts.total)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
      )}

    </div>
  );
}