import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, TrendingUp, DollarSign, ShoppingBag,
  AlertTriangle, Inbox, Users, Clock, Star, ChevronRight,
  MessageSquare, UserCheck, Plus, Eye,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useOrders } from '../context/OrderContext';
import { useReviews } from '../context/ReviewsContext';
import { useFeedback } from '../context/FeedbackContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';

export default function Admin() {
  const { products, lowStock, outOfStock, totalValue } = useInventory();
  const { orders, counts: orderCounts, revenue } = useOrders();
  const { reviews, getStats } = useReviews();
  const { counts: feedbackCounts, messages } = useFeedback();
  const { users, user, tenants } = useAuth();

  const myTenantId = user?.tenantId;
  const myTenant = tenants.find(t => t.id === myTenantId);

  /* ── Team pending for this tenant ── */
  const pendingTeam = useMemo(
    () => users.filter(u => u.tenantId === myTenantId && u.status === 'pending'),
    [users, myTenantId]
  );

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
      // fall back to seed rating
      const seed = products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length;
      return seed.toFixed(1);
    }
    return (totalStars / totalReviews).toFixed(1);
  }, [products, getStats]);

  /* ── Needs attention items ── */
  const attention = [
    orderCounts.pending > 0 && {
      icon: Clock,
      color: 'amber',
      title: `${orderCounts.pending} pending order${orderCounts.pending !== 1 ? 's' : ''}`,
      sub: 'Waiting to be confirmed',
      to: '/orders',
    },
    feedbackCounts.unread > 0 && {
      icon: Inbox,
      color: 'blue',
      title: `${feedbackCounts.unread} unread message${feedbackCounts.unread !== 1 ? 's' : ''}`,
      sub: 'From customers and guests',
      to: '/contact',
    },
    lowStock.length > 0 && {
      icon: AlertTriangle,
      color: 'rose',
      title: `${lowStock.length} low-stock item${lowStock.length !== 1 ? 's' : ''}`,
      sub: 'Restock soon',
      to: '/inventory',
    },
    outOfStock.length > 0 && {
      icon: AlertTriangle,
      color: 'rose',
      title: `${outOfStock.length} out-of-stock item${outOfStock.length !== 1 ? 's' : ''}`,
      sub: 'Customers can\'t buy these',
      to: '/inventory',
    },
    pendingTeam.length > 0 && {
      icon: UserCheck,
      color: 'purple',
      title: `${pendingTeam.length} team member${pendingTeam.length !== 1 ? 's' : ''} awaiting approval`,
      sub: 'Review registrations',
      to: '/team',
    },
  ].filter(Boolean);

  /* ── KPIs ── */
  const kpis = [
    {
      label: 'Revenue',
      value: formatCurrency(revenue || 0),
      sub: `${orderCounts.fulfilled} fulfilled`,
      icon: DollarSign,
      color: 'emerald',
      to: '/orders',
    },
    {
      label: 'Pending Orders',
      value: orderCounts.pending,
      sub: `${orderCounts.total} total`,
      icon: Clock,
      color: 'amber',
      to: '/orders',
    },
    {
      label: 'Products',
      value: products.length,
      sub: `${outOfStock.length} out of stock`,
      icon: ShoppingBag,
      color: 'purple',
      to: '/inventory',
    },
    {
      label: 'Avg Rating',
      value: avgRating,
      sub: `${reviews.length} reviews`,
      icon: Star,
      color: 'pink',
      to: '/shop',
    },
  ];

  /* ── Recent activity feed ── */
  const activity = useMemo(() => {
    const items = [];

    // Latest 3 orders
    [...orders].slice(0, 3).forEach(o => {
      items.push({
        id: `o-${o.id}`,
        type: 'order',
        icon: Package,
        color: 'blue',
        title: `${o.customer?.name || 'Guest'} placed an order`,
        sub: `${o.items?.length || 0} item${o.items?.length !== 1 ? 's' : ''} · ${formatCurrency(o.total || 0)}`,
        when: o.createdAt,
        to: '/orders',
      });
    });

    // Latest 3 reviews
    [...reviews].slice(0, 3).forEach(r => {
      const product = products.find(p => p.id === r.productId);
      items.push({
        id: `r-${r.id}`,
        type: 'review',
        icon: Star,
        color: 'amber',
        title: `${r.authorName} left a ${r.rating}★ review`,
        sub: product?.name || 'Unknown product',
        when: r.createdAt,
        to: `/product/${r.productId}`,
      });
    });

    // Latest 2 feedback messages
    [...messages].slice(0, 2).forEach(m => {
      items.push({
        id: `f-${m.id}`,
        type: 'feedback',
        icon: MessageSquare,
        color: 'indigo',
        title: `${m.name || 'Guest'} sent a message`,
        sub: m.subject,
        when: m.createdAt,
        to: '/contact',
      });
    });

    // Pending team registrations
    pendingTeam.slice(0, 2).forEach(u => {
      items.push({
        id: `u-${u.id}`,
        type: 'team',
        icon: UserCheck,
        color: 'purple',
        title: `${u.name} wants to join`,
        sub: u.email,
        when: u.createdAt,
        to: '/team',
      });
    });

    // Sort newest first
    return items
      .filter(i => i.when)
      .sort((a, b) => new Date(b.when) - new Date(a.when))
      .slice(0, 6);
  }, [orders, reviews, messages, pendingTeam, products]);

  /* ── Latest reviews for the widget ── */
  const latestReviews = useMemo(() => {
    return [...reviews]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
      .map(r => ({
        ...r,
        product: products.find(p => p.id === r.productId),
      }));
  }, [reviews, products]);

  const colorMap = {
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',    text: 'text-amber-600' },
    purple:  { bg: 'bg-purple-50',   text: 'text-purple-600' },
    pink:    { bg: 'bg-pink-50',     text: 'text-pink-600' },
    blue:    { bg: 'bg-blue-50',     text: 'text-blue-600' },
    indigo:  { bg: 'bg-indigo-50',   text: 'text-indigo-600' },
    rose:    { bg: 'bg-rose-50',     text: 'text-rose-600' },
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 space-y-5">

      {/* ═══ HEADER ═══ */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amir-purple/70 via-amir-pink/50 to-amir-blue/70 p-5 sm:p-7 shadow-sm">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/25 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-black text-amir-dark leading-tight flex items-center gap-2">
              👑 Owner Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-amir-dark/70 font-semibold mt-1">
              {myTenant?.name ? `${myTenant.name} · ` : ''}
              {attention.length > 0
                ? `${attention.length} thing${attention.length !== 1 ? 's' : ''} need your attention`
                : 'Everything looks good ✨'}
            </p>
          </div>

          <Link
            to="/shop"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/70 hover:bg-white text-amir-dark font-bold text-xs sm:text-sm transition-colors"
          >
            <Eye size={14} /> View shop
          </Link>
        </div>
      </div>

      {/* ═══ NEEDS ATTENTION ═══ */}
      {attention.length > 0 ? (
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-sm sm:text-base flex items-center gap-2 text-gray-900">
              <AlertTriangle size={16} className="text-rose-500" />
              Needs Your Attention
            </h2>
            <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">
              {attention.length}
            </span>
          </div>

          <div className="space-y-2">
            {attention.map((a, i) => {
              const c = colorMap[a.color];
              const Icon = a.icon;
              return (
                <Link
                  key={i}
                  to={a.to}
                  className={`flex items-center gap-3 p-3 rounded-xl ${c.bg} hover:shadow-sm transition-all active:scale-[0.99]`}
                >
                  <span className={`w-9 h-9 rounded-lg bg-white ${c.text} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 leading-tight truncate">
                      {a.title}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{a.sub}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-bold text-sm text-emerald-800">All caught up!</p>
            <p className="text-[11px] text-emerald-700">Nothing needs your attention right now.</p>
          </div>
        </div>
      )}

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
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

      {/* ═══ RECENT ACTIVITY + LATEST REVIEWS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Activity */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-sm sm:text-base flex items-center gap-2 text-gray-900">
              <TrendingUp size={16} className="text-blue-500" />
              Recent Activity
            </h2>
          </div>

          {activity.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <TrendingUp size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold">No activity yet</p>
              <p className="text-[11px] mt-0.5">Orders, reviews, and messages will show up here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map(a => {
                const c = colorMap[a.color];
                const Icon = a.icon;
                return (
                  <Link
                    key={a.id}
                    to={a.to}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-8 h-8 rounded-lg ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
                      <Icon size={14} />
                    </span>
                    <div className="flex-1 min-w-0">
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
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-sm sm:text-base flex items-center gap-2 text-gray-900">
              <Star size={16} className="text-amber-500" />
              Latest Reviews
            </h2>
            <Link to="/shop" className="text-xs text-blue-600 hover:underline">
              View shop
            </Link>
          </div>

          {latestReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Star size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold">No reviews yet</p>
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

      {/* ═══ QUICK LINKS ═══ */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="font-black text-sm sm:text-base mb-3 text-gray-900">
          Quick Links
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { to: '/orders',    label: 'Orders',    icon: Package,      color: 'blue' },
            { to: '/inventory', label: 'Inventory', icon: ShoppingBag,  color: 'purple' },
            { to: '/team',      label: 'Team',      icon: Users,        color: 'indigo' },
            { to: '/contact',   label: 'Feedback',  icon: MessageSquare,color: 'pink' },
            { to: '/shop',      label: 'My Shop',   icon: Eye,          color: 'emerald' },
          ].map((q, i) => {
            const c = colorMap[q.color];
            const Icon = q.icon;
            return (
              <Link
                key={i}
                to={q.to}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl ${c.bg} hover:shadow-md transition-all active:scale-95`}
              >
                <span className={`w-9 h-9 rounded-lg bg-white ${c.text} flex items-center justify-center shadow-sm`}>
                  <Icon size={16} />
                </span>
                <span className="text-xs font-bold text-gray-700">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}