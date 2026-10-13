import { useMemo, useState } from 'react';
import {
  Search, CheckCircle2, Truck, XCircle, Clock, MapPin,
  Pencil, Trash2, X, Save, ChevronDown, Mail, Phone, CreditCard,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useOrders, ORDER_STATUS } from '../context/OrderContext';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { useExtras } from '../context/ExtrasContext';
import { formatCurrency } from '../utils/format';
import Skeleton from '../components/UI/Skeleton';
import { useDelayedReady } from '../hooks/useDelayedReady';
import InvoiceModal from '../components/Orders/InvoiceModal';

const STATUS_META = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  fulfilled: { label: 'Fulfilled', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export default function Orders() {
  const { orders, confirmOrder, fulfillOrder, cancelOrder, deleteOrder, updateOrder, counts } = useOrders();
  const { updateStock, products } = useInventory();
  const { isOwner, isSales } = useAuth();
  const { notify } = useExtras();
  const canEdit = isOwner || isSales;

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [invoicing, setInvoicing] = useState(null); // 🧾 order being invoiced

  const ready = useDelayedReady(400);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (filter !== 'all') list = list.filter(o => o.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.email?.toLowerCase().includes(q) ||
        o.customer?.phone?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filter, query]);

  /* ═══════════════════════════════════════════════════════════
     ACTIONS — with notifications
     ═══════════════════════════════════════════════════════════ */
  const handleConfirm = (order) => {
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        updateStock(product.id, Math.max(0, product.stock - item.qty));
      }
    });
    confirmOrder(order.id);

    if (order.customer?.email) {
      notify(order.customer.email, {
        type: 'order',
        title: `Order ${order.id} confirmed`,
        body: `Great news! Your order has been confirmed and is being prepared for delivery.`,
        link: '/my-orders',
      });
    }
    toast.success('Order confirmed', { icon: '✅' });
  };

  const handleFulfill = (order) => {
    fulfillOrder(order.id);

    if (order.customer?.email) {
      notify(order.customer.email, {
        type: 'order',
        title: `Order ${order.id} is on its way!`,
        body: `Your order has been fulfilled and is heading to you. Track it in My Orders.`,
        link: '/my-orders',
      });
    }
    toast.success('Order fulfilled', { icon: '🚚' });
  };

  const handleCancel = (order) => {
    if (confirm(`Cancel order ${order.id}?`)) {
      cancelOrder(order.id);

      if (order.customer?.email) {
        notify(order.customer.email, {
          type: 'order',
          title: `Order ${order.id} cancelled`,
          body: `Your order has been cancelled. Contact us if this was a mistake.`,
          link: '/my-orders',
        });
      }
      toast.error('Order cancelled', { icon: '❌' });
    }
  };

  const handleDelete = (order) => {
    if (confirm(`Delete order ${order.id}? This cannot be undone.`)) {
      deleteOrder(order.id);
    }
  };

  const tabs = [
    { id: 'all',       label: 'All',       count: counts.total },
    { id: 'pending',   label: 'Pending',   count: counts.pending },
    { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
    { id: 'fulfilled', label: 'Fulfilled', count: counts.fulfilled },
    { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-8">
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black">Orders</h1>
        <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
          Review, confirm, and fulfill incoming orders
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`shrink-0 px-3.5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
              filter === t.id
                ? 'bg-amir-pink text-amir-dark shadow-sm'
                : 'bg-transparent text-gray-500 hover:text-amir-dark hover:bg-amir-pink/10'
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 rounded-full ${
              filter === t.id ? 'bg-amir-dark/10' : 'bg-gray-100'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amir-dark/40" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by order ID, name, email, or phone..."
          className="input pl-11"
        />
      </div>

      {!ready ? (
        <Skeleton.List count={5} />
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="font-bold">No orders found</p>
          <p className="text-xs text-amir-dark/60 mt-1">
            {query || filter !== 'all' ? 'Try a different filter' : 'New orders will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filtered.map(o => {
            const meta = STATUS_META[o.status] || STATUS_META.pending;
            const isActionable =
              o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.CONFIRMED;
            const isOpen = expanded === o.id;

            return (
              <div key={o.id} className="card overflow-hidden">

                <button
                  onClick={() => setExpanded(isOpen ? null : o.id)}
                  className="w-full text-left p-3 sm:p-4 active:bg-amir-cream/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <p className="font-black text-xs sm:text-sm font-mono truncate">{o.id}</p>
                      <span className="text-[9px] text-amir-dark/40 shrink-0 hidden sm:inline">·</span>
                      <p className="text-[9px] sm:text-[10px] text-amir-dark/50 font-semibold truncate shrink-0 hidden sm:block">
                        {new Date(o.createdAt).toLocaleString([], {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`badge border ${meta.cls} text-[9px] sm:text-[10px] px-2 py-0.5`}>
                        {meta.label}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-amir-dark/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold truncate">
                        {o.customer?.name || 'Guest'}
                      </p>
                      <p className="text-[10px] text-amir-dark/60 font-semibold truncate">
                        {o.customer?.phone || o.customer?.email}
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {o.items.slice(0, 2).map((it, i) => (
                        <div key={i} className="relative">
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <span className="absolute -top-1 -right-1 bg-amir-dark text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                            {it.qty}
                          </span>
                        </div>
                      ))}
                      {o.items.length > 2 && (
                        <div className="w-8 h-8 rounded-lg bg-amir-cream flex items-center justify-center text-[9px] font-bold text-amir-dark/60">
                          +{o.items.length - 2}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-black text-sm leading-none">
                        {formatCurrency(o.total)}
                      </p>
                      <p className="text-[9px] text-amir-dark/50 font-semibold mt-0.5">
                        {o.items.length} item{o.items.length !== 1 && 's'}
                      </p>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-amir-dark/5 p-3 sm:p-4 bg-amir-cream/30 animate-fade-in">

                    {canEdit && (
                      <div className="flex gap-1.5 mb-3">
                        <button
                          onClick={() => setEditing(o)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold text-amir-dark bg-white border border-amir-dark/10 hover:bg-amir-pink/20"
                        >
                          <Pencil size={12} /> Edit order
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50"
                        >
                          <Trash2 size={12} /> Delete order
                        </button>
                      </div>
                    )}

                    <p className="text-[10px] text-amir-dark/50 font-semibold mb-2 sm:hidden">
                      Placed on {new Date(o.createdAt).toLocaleString([], {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
                      Items ({o.items.length})
                    </p>
                    <div className="space-y-2 mb-3">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl p-2 border border-amir-dark/5">
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold leading-tight line-clamp-2">{it.name}</p>
                            <p className="text-[10px] text-amir-dark/50 font-semibold mt-0.5">
                              {[it.size, it.color].filter(Boolean).join(' • ') || 'Standard'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black">{formatCurrency(it.price * it.qty)}</p>
                            <p className="text-[10px] text-amir-dark/50 font-semibold">
                              {it.qty} × {formatCurrency(it.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
                      Customer
                    </p>
                    <div className="bg-white rounded-xl p-3 border border-amir-dark/5 space-y-1.5 mb-3">
                      <p className="text-xs font-bold">{o.customer?.name || 'Guest'}</p>
                      {o.customer?.email && (
                        <p className="text-[11px] text-amir-dark/70 flex items-center gap-1.5">
                          <Mail size={11} className="shrink-0" /> {o.customer.email}
                        </p>
                      )}
                      {o.customer?.phone && (
                        <p className="text-[11px] text-amir-dark/70 flex items-center gap-1.5">
                          <Phone size={11} className="shrink-0" /> {o.customer.phone}
                        </p>
                      )}
                      {o.customer?.address && (
                        <p className="text-[11px] text-amir-dark/70 flex items-start gap-1.5">
                          <MapPin size={11} className="shrink-0 mt-0.5" />
                          <span>{o.customer.address}, {o.customer.city} {o.customer.zip}</span>
                        </p>
                      )}
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-2">
                      Summary
                    </p>
                    <div className="bg-white rounded-xl p-3 border border-amir-dark/5 space-y-1.5 text-xs">
                      {o.subtotal !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-amir-dark/60 font-semibold">Subtotal</span>
                          <span className="font-bold">{formatCurrency(o.subtotal)}</span>
                        </div>
                      )}

                      {o.discount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span className="font-semibold flex items-center gap-1">
                            Discount
                            {o.couponCode && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-mono font-bold uppercase tracking-wider">
                                {o.couponCode}
                              </span>
                            )}
                          </span>
                          <span className="font-bold">−{formatCurrency(o.discount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-1.5 border-t border-amir-dark/10 text-sm">
                        <span className="font-black">Total</span>
                        <span className="font-black">{formatCurrency(o.total)}</span>
                      </div>

                      {o.payment && (
                        <div className="flex justify-between pt-1.5 border-t border-amir-dark/5">
                          <span className="text-amir-dark/60 font-semibold flex items-center gap-1">
                            <CreditCard size={11} /> Payment
                          </span>
                          <span className="font-bold uppercase text-[11px]">{o.payment}</span>
                        </div>
                      )}
                    </div>

                    {/* 🧾 Print invoice */}
                    <button
                      type="button"
                      onClick={() => setInvoicing(o)}
                      className="w-full mt-3 py-2.5 rounded-full bg-white border-2 border-gray-200 text-amir-dark hover:bg-gray-50 font-bold text-xs inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                    >
                      <Printer size={14} /> Print invoice
                    </button>

                    {isActionable && (
                      <div className="flex gap-1.5 mt-3 pt-3 border-t border-amir-dark/10">
                        {o.status === ORDER_STATUS.PENDING && (
                          <button
                            onClick={() => handleConfirm(o)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-full text-xs transition-all active:scale-95 inline-flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 size={14} /> Confirm order
                          </button>
                        )}
                        {o.status === ORDER_STATUS.CONFIRMED && (
                          <button
                            onClick={() => handleFulfill(o)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-full text-xs transition-all active:scale-95 inline-flex items-center justify-center gap-1.5"
                          >
                            <Truck size={14} /> Fulfill order
                          </button>
                        )}
                        <button
                          onClick={() => handleCancel(o)}
                          className="px-3 py-2 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {!isActionable && o.customer?.address && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amir-dark/50 font-semibold mt-3 pt-3 border-t border-amir-dark/10">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">
                          {o.customer.address}, {o.customer.city}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditOrderModal
          order={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateOrder(editing.id, patch);
            setEditing(null);
          }}
        />
      )}

      {/* 🧾 Invoice modal */}
      {invoicing && (
        <InvoiceModal
          order={invoicing}
          title="Invoice"
          onClose={() => setInvoicing(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Edit Order Modal ───────────── */
function EditOrderModal({ order, onClose, onSave }) {
  const [form, setForm] = useState({
    name:    order.customer?.name    || '',
    email:   order.customer?.email   || '',
    phone:   order.customer?.phone   || '',
    address: order.customer?.address || '',
    city:    order.customer?.city    || '',
    zip:     order.customer?.zip     || '',
  });

  const submit = (e) => {
    e.preventDefault();
    onSave({
      customer: {
        ...order.customer,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        zip: form.zip.trim(),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between">
          <div>
            <p className="font-black text-base">Edit order</p>
            <p className="text-[11px] font-mono text-amir-dark/50">{order.id}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-9 h-9 hover:bg-amir-pink/20"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
              Customer name
            </label>
            <input
              required
              className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
                Email
              </label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
                Phone
              </label>
              <input
                className="input"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
              Street address
            </label>
            <input
              required
              className="input"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
                City
              </label>
              <input
                required
                className="input"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1 block">
                ZIP
              </label>
              <input
                required
                className="input"
                value={form.zip}
                onChange={e => setForm({ ...form, zip: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-amir-dark/5">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 py-3">
              <Save size={16} /> Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}