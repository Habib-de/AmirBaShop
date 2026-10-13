import { useMemo, useState, useRef, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Package,
  Download, Calendar, ChevronDown, RefreshCw, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useOrders, ORDER_STATUS } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import { useDelayedReady } from '../hooks/useDelayedReady';
import Skeleton from '../components/UI/Skeleton';
import SEO from '../components/SEO';

/* ═══════════════════════════════════════════════════════════
   PALETTE
   ═══════════════════════════════════════════════════════════ */
const COLORS = {
  pink:    '#FFB6C1',
  purple:  '#C4A7E7',
  blue:    '#A8D0F5',
  emerald: '#7DD3A0',
  amber:   '#FCD34D',
  rose:    '#FB7185',
  indigo:  '#A5B4FC',
  gray:    '#9CA3AF',
};

const STATUS_COLORS = {
  pending:   COLORS.amber,
  confirmed: COLORS.blue,
  fulfilled: COLORS.emerald,
  cancelled: COLORS.rose,
};

const RANGE_OPTIONS = [
  { id: '7d',  label: '7 days',   days: 7  },
  { id: '30d', label: '30 days',  days: 30 },
  { id: '90d', label: '90 days',  days: 90 },
  { id: 'all', label: 'All time', days: null },
];

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
export default function Analytics() {
  const { orders } = useOrders();
  const { isOwner } = useAuth();
  const ready = useDelayedReady(400);

  const [rangeId, setRangeId] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const range = RANGE_OPTIONS.find(r => r.id === rangeId) || RANGE_OPTIONS[1];

  const filteredOrders = useMemo(() => {
    if (!range.days) return orders;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range.days);
    return orders.filter(o => new Date(o.createdAt) >= cutoff);
  }, [orders, range.days]);

  /* ═══ KPIs ═══ */
  const kpis = useMemo(() => {
    const paid = filteredOrders.filter(o =>
      o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.FULFILLED
    );
    const totalRevenue = paid.reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrder = paid.length > 0 ? totalRevenue / paid.length : 0;

    const customers = new Set(
      filteredOrders
        .map(o => o.customer?.email?.toLowerCase())
        .filter(Boolean)
    );
    const totalCustomers = customers.size;

    let revenueDelta = null;
    let ordersDelta = null;

    if (range.days) {
      const prevStart = new Date();
      prevStart.setDate(prevStart.getDate() - range.days * 2);
      const prevEnd = new Date();
      prevEnd.setDate(prevEnd.getDate() - range.days);

      const prevOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= prevStart && d < prevEnd;
      });
      const prevPaid = prevOrders.filter(o =>
        o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.FULFILLED
      );
      const prevRevenue = prevPaid.reduce((s, o) => s + (o.total || 0), 0);

      if (prevRevenue > 0) {
        revenueDelta = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);
      }
      if (prevOrders.length > 0) {
        ordersDelta = Math.round(((totalOrders - prevOrders.length) / prevOrders.length) * 100);
      }
    }

    return {
      revenue: totalRevenue,
      orders: totalOrders,
      avgOrder,
      customers: totalCustomers,
      revenueDelta,
      ordersDelta,
    };
  }, [filteredOrders, orders, range.days]);

  /* ═══ KPI DETAILS (for hover popovers) ═══ */
  const kpiDetails = useMemo(() => {
    const paid = filteredOrders.filter(o =>
      o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.FULFILLED
    );

    /* Revenue breakdown */
    const revenueByStatus = {
      confirmed: paid.filter(o => o.status === ORDER_STATUS.CONFIRMED).reduce((s, o) => s + (o.total || 0), 0),
      fulfilled: paid.filter(o => o.status === ORDER_STATUS.FULFILLED).reduce((s, o) => s + (o.total || 0), 0),
    };
    const topRevenueOrders = [...paid]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 3);

    /* Orders breakdown */
    const ordersByStatus = {
      pending:   filteredOrders.filter(o => o.status === ORDER_STATUS.PENDING).length,
      confirmed: filteredOrders.filter(o => o.status === ORDER_STATUS.CONFIRMED).length,
      fulfilled: filteredOrders.filter(o => o.status === ORDER_STATUS.FULFILLED).length,
      cancelled: filteredOrders.filter(o => o.status === ORDER_STATUS.CANCELLED).length,
    };

    /* Avg order spread */
    const totals = paid.map(o => o.total || 0).sort((a, b) => a - b);
    const minOrder = totals[0] || 0;
    const maxOrder = totals[totals.length - 1] || 0;
    const medianOrder = totals.length > 0 ? totals[Math.floor(totals.length / 2)] : 0;
    const topAvgOrders = [...paid]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 3);

    /* Top customers */
    const customerMap = {};
    filteredOrders.forEach(o => {
      const email = o.customer?.email?.toLowerCase();
      if (!email) return;
      if (!customerMap[email]) {
        customerMap[email] = {
          email,
          name: o.customer?.name || 'Guest',
          orders: 0,
          spent: 0,
        };
      }
      customerMap[email].orders += 1;
      if (o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.FULFILLED) {
        customerMap[email].spent += o.total || 0;
      }
    });
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    return {
      revenueByStatus,
      topRevenueOrders,
      ordersByStatus,
      minOrder,
      maxOrder,
      medianOrder,
      topAvgOrders,
      topCustomers,
    };
  }, [filteredOrders]);

  /* ═══ Timeline ═══ */
  const timelineData = useMemo(() => {
    const days = range.days || 30;
    const buckets = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, revenue: 0, orders: 0 };
    }

    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      if (buckets[key]) {
        buckets[key].orders += 1;
        if (o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.FULFILLED) {
          buckets[key].revenue += o.total || 0;
        }
      }
    });

    return Object.values(buckets).map(b => ({
      ...b,
      label: new Date(b.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
    }));
  }, [filteredOrders, range.days]);

  /* ═══ Status ═══ */
  const statusData = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, fulfilled: 0, cancelled: 0 };
    filteredOrders.forEach(o => {
      if (counts[o.status] !== undefined) counts[o.status] += 1;
    });

    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value,
        color: STATUS_COLORS[status],
        status,
      }));
  }, [filteredOrders]);

  /* ═══ Top products ═══ */
  const topProducts = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      if (o.status === ORDER_STATUS.CANCELLED) return;
      (o.items || []).forEach(item => {
        const key = item.id;
        if (!map[key]) {
          map[key] = { id: item.id, name: item.name, image: item.image, qty: 0, revenue: 0 };
        }
        map[key].qty += item.qty || 0;
        map[key].revenue += (item.price || 0) * (item.qty || 0);
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filteredOrders]);

  /* ═══ Top categories ═══ */
  const topCategories = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      if (o.status === ORDER_STATUS.CANCELLED) return;
      (o.items || []).forEach(item => {
        const cat = item.category || 'other';
        if (!map[cat]) {
          map[cat] = { category: cat, qty: 0, revenue: 0, products: {} };
        }
        map[cat].qty += item.qty || 0;
        map[cat].revenue += (item.price || 0) * (item.qty || 0);

        const pid = item.id;
        if (!map[cat].products[pid]) {
          map[cat].products[pid] = {
            id: item.id,
            name: item.name,
            image: item.image,
            qty: 0,
            revenue: 0,
          };
        }
        map[cat].products[pid].qty += item.qty || 0;
        map[cat].products[pid].revenue += (item.price || 0) * (item.qty || 0);
      });
    });

    return Object.values(map)
      .map(c => ({
        ...c,
        products: Object.values(c.products).sort((a, b) => b.revenue - a.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  /* ═══ Funnel ═══ */
  const funnel = useMemo(() => {
    const orderCount = kpis.orders || 1;
    const views = Math.round(orderCount * 14.5);
    const carts = Math.round(orderCount * 4.2);
    const checkouts = Math.round(orderCount * 1.6);
    const placed = orderCount;

    return [
      {
        label: 'Views',
        value: views,
        color: COLORS.blue,
        explanation: 'Estimated product page views in this period. Calculated from your order volume — you don\'t yet have page-view tracking.',
      },
      {
        label: 'Cart adds',
        value: carts,
        color: COLORS.purple,
        explanation: 'Estimated times a customer added something to their cart. Estimated from order volume.',
      },
      {
        label: 'Checkouts',
        value: checkouts,
        color: COLORS.pink,
        explanation: 'Estimated times a customer started checkout. Estimated from order volume.',
      },
      {
        label: 'Orders',
        value: placed,
        color: COLORS.emerald,
        explanation: 'Actual orders placed in this period. This is real data from your order records.',
      },
    ];
  }, [kpis.orders]);

  /* ═══ Handlers ═══ */
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleExportCSV = () => {
    if (!filteredOrders.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Order ID', 'Date', 'Status', 'Customer', 'Email', 'Items', 'Total (KES)'];
    const rows = filteredOrders.map(o => [
      o.id,
      new Date(o.createdAt).toISOString(),
      o.status,
      o.customer?.name || 'Guest',
      o.customer?.email || '',
      (o.items || []).length,
      o.total || 0,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amir-analytics-${rangeId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredOrders.length} orders`, { icon: '📥' });
  };

  /* ═══ Guards ═══ */
  if (!isOwner) {
    return (
      <>
        <SEO title="Analytics" noIndex />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-3">Owner access only</h1>
          <p className="text-sm text-amir-dark/60 font-semibold">
            You need to be the shop owner to view analytics
          </p>
        </div>
      </>
    );
  }

  if (!ready) {
    return (
      <>
        <SEO title="Analytics" noIndex />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-8 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card p-4 h-24 animate-pulse bg-gray-100" />
            ))}
          </div>
          <div className="card p-4 h-72 animate-pulse bg-gray-100" />
          <div className="card p-4 h-72 animate-pulse bg-gray-100" />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Analytics" noIndex />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-8 space-y-5">

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
              <BarChart3 size={26} className="text-amir-pink" />
              Analytics
            </h1>
            <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-0.5">
              Business insights · {range.label}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amir-dark/40 pointer-events-none" />
              <select
                value={rangeId}
                onChange={e => setRangeId(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-8 pr-8 py-2 text-xs sm:text-sm font-bold text-amir-dark focus:ring-2 focus:ring-amir-pink outline-none appearance-none cursor-pointer"
              >
                {RANGE_OPTIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amir-dark/40 pointer-events-none" />
            </div>

            <button
              onClick={handleRefresh}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500"
              title="Refresh"
            >
              <RefreshCw size={16} className={`transition-transform duration-500 ${refreshing ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-amir-pink text-amir-dark font-bold text-xs sm:text-sm transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* ═══ KPI CARDS ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HoverCard content={<RevenueTooltip data={kpiDetails} />}>
            <KpiCard
              icon={DollarSign}
              label="Revenue"
              value={formatCurrency(kpis.revenue)}
              delta={kpis.revenueDelta}
              color="emerald"
            />
          </HoverCard>

          <HoverCard content={<OrdersTooltip data={kpiDetails} />}>
            <KpiCard
              icon={ShoppingBag}
              label="Orders"
              value={kpis.orders}
              delta={kpis.ordersDelta}
              color="blue"
            />
          </HoverCard>

          <HoverCard content={<AvgOrderTooltip data={kpiDetails} />}>
            <KpiCard
              icon={TrendingUp}
              label="Avg Order"
              value={formatCurrency(kpis.avgOrder)}
              color="purple"
            />
          </HoverCard>

          <HoverCard content={<CustomersTooltip data={kpiDetails} />}>
            <KpiCard
              icon={Users}
              label="Customers"
              value={kpis.customers}
              color="pink"
            />
          </HoverCard>
        </div>

        {/* ═══ REVENUE + STATUS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-4">
            <h2 className="font-black text-sm flex items-center gap-2 mb-3">
              📈 Revenue over time
            </h2>
            {timelineData.length === 0 ? (
              <EmptyChart message="No revenue data yet" />
            ) : (
              <div className="h-64 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      interval={Math.floor(timelineData.length / 6)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                        padding: '8px 12px',
                      }}
                      formatter={v => [formatCurrency(v), 'Revenue']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.emerald}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: COLORS.emerald }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card p-4">
            <h2 className="font-black text-sm mb-3">🥧 Order status</h2>
            {statusData.length === 0 ? (
              <EmptyChart message="No orders yet" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ═══ ORDERS BAR + TOP PRODUCTS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-4">
            <h2 className="font-black text-sm mb-3">📊 Orders per day</h2>
            {timelineData.length === 0 ? (
              <EmptyChart message="No orders yet" />
            ) : (
              <div className="h-64 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      interval={Math.floor(timelineData.length / 6)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                      formatter={v => [v, 'Orders']}
                    />
                    <Bar
                      dataKey="orders"
                      fill={COLORS.pink}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card p-4">
            <h2 className="font-black text-sm mb-3 flex items-center gap-2">
              🏆 Top products
            </h2>
            {topProducts.length === 0 ? (
              <EmptyChart message="No products sold yet" compact />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-amir-dark/5 last:border-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-amir-cream text-amir-dark/60'
                    }`}>
                      {i + 1}
                    </span>
                    <img
                      src={p.image}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-amir-dark truncate">{p.name}</p>
                      <p className="text-[10px] text-amir-dark/50 font-semibold">
                        {p.qty} sold
                      </p>
                    </div>
                    <p className="text-[11px] font-black text-emerald-600 shrink-0">
                      {formatCurrency(p.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ FUNNEL + CATEGORIES ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div className="card p-4">
            <h2 className="font-black text-sm mb-3">🔄 Conversion funnel</h2>
            <div className="space-y-3">
              {funnel.map((step, i) => {
                const pct = funnel[0].value > 0
                  ? Math.round((step.value / funnel[0].value) * 100)
                  : 0;
                const prev = i > 0 ? funnel[i - 1].value : step.value;
                const dropoff = prev > 0
                  ? Math.round(((prev - step.value) / prev) * 100)
                  : 0;

                return (
                  <HoverCard
                    key={step.label}
                    content={<FunnelTooltip step={step} pct={pct} dropoff={dropoff} isFirst={i === 0} />}
                  >
                    <div className="cursor-help">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-amir-dark">{step.label}</p>
                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          <span className="text-amir-dark">{step.value.toLocaleString()}</span>
                          <span className="text-amir-dark/40">·</span>
                          <span className="text-amir-dark/60">{pct}%</span>
                          {i > 0 && dropoff > 0 && (
                            <span className="text-rose-500 font-bold">
                              −{dropoff}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-amir-cream overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(pct, 3)}%`,
                            background: step.color,
                          }}
                        />
                      </div>
                    </div>
                  </HoverCard>
                );
              })}
              <p className="text-[10px] text-amir-dark/40 font-semibold pt-2">
                ⓘ Hover or tap each step to see what it means
              </p>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-black text-sm mb-3">🎨 Sales by category</h2>
            {topCategories.length === 0 ? (
              <EmptyChart message="No category data yet" compact />
            ) : (
              <div className="space-y-3">
                {topCategories.slice(0, 6).map((cat, i) => {
                  const maxRevenue = topCategories[0].revenue;
                  const pct = maxRevenue > 0 ? Math.round((cat.revenue / maxRevenue) * 100) : 0;
                  const colorList = [COLORS.pink, COLORS.purple, COLORS.blue, COLORS.emerald, COLORS.amber, COLORS.rose];
                  const color = colorList[i % colorList.length];

                  return (
                    <HoverCard
                      key={cat.category}
                      content={<CategoryTooltip cat={cat} />}
                    >
                      <div className="cursor-help">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-amir-dark capitalize">
                            {cat.category}
                          </p>
                          <div className="text-[11px] font-semibold text-amir-dark/70">
                            {cat.qty} sold · {formatCurrency(cat.revenue)}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-amir-cream overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    </HoverCard>
                  );
                })}
                <p className="text-[10px] text-amir-dark/40 font-semibold pt-2">
                  ⓘ Hover or tap to see top products in each category
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   HOVER CARD — works on desktop hover + mobile tap
   ═══════════════════════════════════════════════════════════ */
function HoverCard({ children, content }) {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef(null);
  const wrapperRef = useRef(null);

  /* Desktop hover */
  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setOpen(true), 200);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(false);
  };

  /* Mobile tap: toggle on click, close on outside click */
  const handleClick = (e) => {
    if (window.matchMedia('(hover: hover)').matches) return; // desktop: skip
    e.stopPropagation();
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}

      {open && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 sm:w-80
                     bg-white rounded-2xl shadow-2xl border border-amir-dark/10
                     p-4 animate-fade-in pointer-events-none"
          onClick={e => e.stopPropagation()}
        >
          {content}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP CONTENT — Revenue
   ═══════════════════════════════════════════════════════════ */
function RevenueTooltip({ data }) {
  const { revenueByStatus, topRevenueOrders } = data;
  const total = revenueByStatus.confirmed + revenueByStatus.fulfilled;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/50 mb-2">
          💰 Revenue breakdown
        </p>
        <div className="space-y-1.5">
          <TooltipLine label="From fulfilled orders" value={formatCurrency(revenueByStatus.fulfilled)} color="emerald" total={total} />
          <TooltipLine label="From confirmed orders" value={formatCurrency(revenueByStatus.confirmed)} color="blue" total={total} />
        </div>
      </div>

      {topRevenueOrders.length > 0 && (
        <div className="pt-2 border-t border-amir-dark/5">
          <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/50 mb-2">
            🏆 Top orders
          </p>
          <div className="space-y-1">
            {topRevenueOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-amir-dark/60 truncate">{o.id}</span>
                <span className="font-bold text-amir-dark ml-2 shrink-0">
                  {formatCurrency(o.total || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-amir-dark/40 pt-1 border-t border-amir-dark/5">
        Only counts confirmed + fulfilled orders
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP CONTENT — Orders
   ═══════════════════════════════════════════════════════════ */
function OrdersTooltip({ data }) {
  const { ordersByStatus } = data;
  const total = Object.values(ordersByStatus).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/50 mb-2">
          📦 Orders by status
        </p>
        <div className="space-y-1.5">
          <TooltipLine label="Pending" value={ordersByStatus.pending} color="amber" total={total} />
          <TooltipLine label="Confirmed" value={ordersByStatus.confirmed} color="blue" total={total} />
          <TooltipLine label="Fulfilled" value={ordersByStatus.fulfilled} color="emerald" total={total} />
          <TooltipLine label="Cancelled" value={ordersByStatus.cancelled} color="rose" total={total} />
        </div>
      </div>

      <p className="text-[10px] text-amir-dark/40 pt-1 border-t border-amir-dark/5">
        Total: {total} order{total !== 1 ? 's' : ''} in this period
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP CONTENT — Avg Order
   ═══════════════════════════════════════════════════════════ */
function AvgOrderTooltip({ data }) {
  const { minOrder, maxOrder, medianOrder, topAvgOrders } = data;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/50 mb-2">
          📊 Order value spread
        </p>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-amir-dark/60 font-semibold">Minimum</span>
            <span className="font-bold text-amir-dark">{formatCurrency(minOrder)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amir-dark/60 font-semibold">Median</span>
            <span className="font-bold text-amir-dark">{formatCurrency(medianOrder)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amir-dark/60 font-semibold">Maximum</span>
            <span className="font-bold text-amir-dark">{formatCurrency(maxOrder)}</span>
          </div>
        </div>
      </div>

      {topAvgOrders.length > 0 && (
        <div className="pt-2 border-t border-amir-dark/5">
          <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/50 mb-2">
            🏆 Highest orders
          </p>
          <div className="space-y-1">
            {topAvgOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-amir-dark/60 truncate">{o.id}</span>
                <span className="font-bold text-amir-dark ml-2 shrink-0">
                  {formatCurrency(o.total || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-amir-dark/40 pt-1 border-t border-amir-dark/5">
        Calculated from confirmed + fulfilled orders only
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP CONTENT — Customers
   ═══════════════════════════════════════════════════════════ */
function CustomersTooltip({ data }) {
  const { topCustomers } = data;

  if (!topCustomers.length) {
    return (
      <div className="text-center py-2">
        <p className="text-xs font-bold text-amir-dark/60">No customers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/50">
        👥 Top customers
      </p>
      <div className="space-y-2">
        {topCustomers.map(c => (
          <div key={c.email} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amir-pink/30 flex items-center justify-center text-[10px] font-black text-amir-dark shrink-0">
              {(c.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-amir-dark truncate">{c.name}</p>
              <p className="text-[10px] text-amir-dark/50 font-semibold">
                {c.orders} order{c.orders !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-[11px] font-black text-emerald-600 shrink-0">
              {formatCurrency(c.spent)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-amir-dark/40 pt-1 border-t border-amir-dark/5">
        Ranked by total amount spent
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP CONTENT — Funnel step
   ═══════════════════════════════════════════════════════════ */
function FunnelTooltip({ step, pct, dropoff, isFirst }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: step.color }}
        />
        <p className="text-xs font-black text-amir-dark">{step.label}</p>
      </div>

      <p className="text-[11px] text-amir-dark/70 font-semibold leading-relaxed">
        {step.explanation}
      </p>

      <div className="pt-2 border-t border-amir-dark/5 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-amir-dark/60 font-semibold">Count</span>
          <span className="font-bold text-amir-dark">{step.value.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-amir-dark/60 font-semibold">Of top</span>
          <span className="font-bold text-amir-dark">{pct}%</span>
        </div>
        {!isFirst && dropoff > 0 && (
          <div className="flex justify-between">
            <span className="text-amir-dark/60 font-semibold">Drop-off</span>
            <span className="font-bold text-rose-500">−{dropoff}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP CONTENT — Category
   ═══════════════════════════════════════════════════════════ */
function CategoryTooltip({ cat }) {
  const topProducts = (cat.products || []).slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-amir-dark capitalize">
          {cat.category}
        </p>
        <p className="text-[11px] font-black text-emerald-600">
          {formatCurrency(cat.revenue)}
        </p>
      </div>

      <div className="flex justify-between text-[11px] text-amir-dark/60 font-semibold pb-2 border-b border-amir-dark/5">
        <span>{cat.qty} units sold</span>
        <span>{topProducts.length} unique product{topProducts.length !== 1 ? 's' : ''}</span>
      </div>

      {topProducts.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/50 mb-2">
            🏆 Top in this category
          </p>
          <div className="space-y-1.5">
            {topProducts.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <img
                  src={p.image}
                  alt=""
                  className="w-7 h-7 rounded-lg object-cover shrink-0"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-amir-dark truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-amir-dark/50 font-semibold">
                    {p.qty} sold
                  </p>
                </div>
                <p className="text-[10px] font-black text-amir-dark shrink-0">
                  {formatCurrency(p.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TooltipLine (helper for tooltips)
   ═══════════════════════════════════════════════════════════ */
function TooltipLine({ label, value, color, total }) {
  const colors = {
    amber:   'bg-amber-400',
    blue:    'bg-blue-400',
    emerald: 'bg-emerald-400',
    rose:    'bg-rose-400',
  };
  const isNumber = typeof value === 'number';
  const pct = isNumber && total > 0 ? Math.round((value / total) * 100) : null;

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={`w-2 h-2 rounded-full shrink-0 ${colors[color] || 'bg-gray-300'}`} />
      <span className="text-amir-dark/70 font-semibold flex-1 truncate">{label}</span>
      {pct !== null && (
        <span className="text-amir-dark/50 font-semibold text-[10px]">{pct}%</span>
      )}
      <span className="font-bold text-amir-dark shrink-0">{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════════════════ */
function KpiCard({ icon: Icon, label, value, delta, color = 'blue' }) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600'    },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-600'  },
    pink:    { bg: 'bg-pink-50',    text: 'text-pink-600'    },
  }[color] || { bg: 'bg-gray-50', text: 'text-gray-600' };

  return (
    <div className="card p-3 sm:p-4 cursor-help hover:border-amir-pink transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold truncate">
            {label}
          </p>
          <p className="text-lg sm:text-2xl font-black mt-1 truncate text-gray-900">
            {value}
          </p>
          {typeof delta === 'number' && (
            <p className={`text-[10px] font-bold mt-0.5 inline-flex items-center gap-0.5 ${
              delta >= 0 ? 'text-emerald-600' : 'text-rose-500'
            }`}>
              {delta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {delta >= 0 ? '+' : ''}{delta}% vs prev
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorMap.bg} ${colorMap.text} shrink-0`}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPTY CHART STATE
   ═══════════════════════════════════════════════════════════ */
function EmptyChart({ message = 'No data', compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'h-64'}`}>
      <Package size={28} className="text-gray-300 mb-2" />
      <p className="text-xs font-bold text-gray-500">{message}</p>
    </div>
  );
}