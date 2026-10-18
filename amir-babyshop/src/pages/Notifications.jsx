import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Package, Star, Ticket, Info, Check, CheckCheck,
  Trash2, ChevronRight, MailOpen, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useExtras } from '../context/ExtrasContext';
import { useAuth } from '../context/AuthContext';

/* ─── Icon + color per notification type ─── */
const TYPE_META = {
  order:   { icon: Package, color: 'blue',    label: 'Order' },
  review:  { icon: Star,    color: 'amber',   label: 'Review' },
  promo:   { icon: Ticket,  color: 'pink',    label: 'Promo' },
  system:  { icon: Info,    color: 'indigo',  label: 'System' },
  info:    { icon: Info,    color: 'gray',    label: 'Info' },
};

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-200' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'ring-amber-200' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-600',   ring: 'ring-pink-200' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200' },
  gray:   { bg: 'bg-gray-50',   text: 'text-gray-600',   ring: 'ring-gray-200' },
};

export default function Notifications() {
  const { user } = useAuth();
  const {
    getMyNotifs,
    getUnreadNotifCount,
    markNotifRead,
    markAllNotifsRead,
    clearNotifs,
  } = useExtras();

  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'order' | 'review' | 'promo'

  const all = useMemo(
    () => (user ? getMyNotifs(user.email) : []),
    [user, getMyNotifs]
  );

  const unreadCount = user ? getUnreadNotifCount(user.email) : 0;

  /* ─── Filtered list ─── */
  const filtered = useMemo(() => {
    if (filter === 'all') return all;
    if (filter === 'unread') return all.filter(n => !n.read);
    return all.filter(n => n.type === filter);
  }, [all, filter]);

  /* ─── Not signed in ─── */
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🔔</div>
        <h1 className="text-xl font-black mb-3">Sign in to see notifications</h1>
        <p className="text-xs text-amir-dark/60 font-semibold mb-5">
          Get updates on your orders, reviews, and promos
        </p>
        <Link to="/login" className="btn-primary inline-flex">Sign in</Link>
      </div>
    );
  }

  const handleMarkAll = () => {
    if (unreadCount === 0) {
      toast('Nothing to mark', { icon: '✓' });
      return;
    }
    markAllNotifsRead(user.email);
    toast.success('All marked as read', { icon: '📖' });
  };

  const handleClearAll = () => {
    if (all.length === 0) return;
    if (confirm('Clear all notifications? This cannot be undone.')) {
      clearNotifs(user.email);
      toast.success('Notifications cleared', { icon: '🧹' });
    }
  };

  const tabs = [
    { id: 'all',    label: 'All',    count: all.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'order',  label: 'Orders', count: all.filter(n => n.type === 'order').length },
    { id: 'review', label: 'Reviews', count: all.filter(n => n.type === 'review').length },
    { id: 'promo',  label: 'Promos', count: all.filter(n => n.type === 'promo').length },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Bell size={24} className="text-amir-pink" />
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'You\'re all caught up'}
          </p>
        </div>

        {all.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleMarkAll}
              className="text-xs font-bold text-amir-dark/60 hover:text-amir-dark px-3 py-2 rounded-full hover:bg-amir-pink/20 inline-flex items-center gap-1.5 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={14} />
              <span className="hidden xs:inline">Mark all</span>
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-2 rounded-full hover:bg-rose-50 inline-flex items-center gap-1.5 transition-colors"
              title="Clear all"
            >
              <Trash2 size={14} />
              <span className="hidden xs:inline">Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {all.length > 0 && (
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
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full ${
                  filter === t.id ? 'bg-amir-dark/10' : 'bg-gray-100'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {all.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🔔</div>
          <p className="font-bold">No notifications yet</p>
          <p className="text-xs text-amir-dark/60 mt-1">
            Order updates, review replies, and promos will appear here
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="font-bold">
            {filter === 'unread' ? 'All caught up!' : 'Nothing here'}
          </p>
          <p className="text-xs text-amir-dark/60 mt-1">
            {filter === 'unread'
              ? 'You\'ve read all your notifications'
              : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <NotifCard
              key={n.id}
              notif={n}
              onMarkRead={() => markNotifRead(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Individual notification card ─── */
function NotifCard({ notif, onMarkRead }) {
  const meta = TYPE_META[notif.type] || TYPE_META.info;
  const colors = COLOR_MAP[meta.color] || COLOR_MAP.gray;
  const Icon = meta.icon;

  const relTime = (() => {
    const diff = Date.now() - new Date(notif.createdAt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(notif.createdAt).toLocaleDateString([], {
      month: 'short', day: 'numeric',
    });
  })();

  const Wrapper = notif.link ? Link : 'div';
  const wrapperProps = notif.link
    ? { to: notif.link, onClick: onMarkRead }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`card p-3 sm:p-4 flex items-start gap-3 transition-all ${
        !notif.read
          ? 'bg-amir-pink/10 border-l-4 border-amir-pink'
          : 'hover:bg-gray-50'
      } ${notif.link ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center shrink-0`}>
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className={`text-sm leading-tight ${!notif.read ? 'font-black text-amir-dark' : 'font-bold text-amir-dark/80'}`}>
            {notif.title}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-amir-pink shrink-0 mt-1.5" />
          )}
        </div>

        {notif.body && (
          <p className="text-[11px] text-amir-dark/60 leading-relaxed line-clamp-2">
            {notif.body}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className={`badge text-[9px] px-1.5 py-0.5 ${colors.bg} ${colors.text}`}>
            {meta.label}
          </span>
          <span className="text-[10px] text-amir-dark/40 font-semibold">
            {relTime}
          </span>
          {!notif.read && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkRead();
              }}
              className="text-[10px] text-amir-dark/60 hover:text-amir-dark font-bold inline-flex items-center gap-1 underline ml-auto"
            >
              <MailOpen size={10} /> Mark read
            </button>
          )}
        </div>
      </div>

      {/* Chevron if clickable */}
      {notif.link && (
        <ChevronRight size={16} className="text-amir-dark/40 shrink-0 mt-1" />
      )}
    </Wrapper>
  );
}