import { useState, useMemo } from 'react';
import {
  Mail, Phone, MapPin, Clock, MessageCircle, Send,
  Inbox, CheckCircle2, Trash2, Search, X, User, Reply, MessageSquare,
  ChevronDown, Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { SHOP_INFO } from '../data/shopInfo';

export default function Contact() {
  const { user, isStaff } = useAuth();
  const feedback = useFeedback();

  if (isStaff) {
    return (
      <FeedbackInbox
        messages={feedback.messages}
        counts={feedback.counts}
        currentUser={user}
        onAddReply={feedback.addReply}
        onMarkRead={feedback.markRead}
        onMarkResolved={feedback.markResolved}
        onDelete={feedback.deleteMessage}
      />
    );
  }

  return <CustomerView user={user} feedback={feedback} />;
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMER / GUEST view
   ═══════════════════════════════════════════════════════════ */
function CustomerView({ user, feedback }) {
  const [tab, setTab] = useState(null);   // null | 'new' | 'mine'

  const myMessages = useMemo(() => {
    if (user?.email) return feedback.findByEmail(user.email);
    try {
      const ids = JSON.parse(localStorage.getItem('amir_feedback_ids')) || [];
      return ids.map(id => feedback.messages.find(m => m.id === id)).filter(Boolean);
    } catch {
      return [];
    }
  }, [user, feedback]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">💬</div>
        <h1 className="text-2xl sm:text-3xl font-black">Get in touch</h1>
        <p className="text-sm text-amir-dark/60 font-semibold mt-1">
          We'd love to hear from you
        </p>
      </div>

      {/* 📍 Physical shop location — embedded */}
      <LocateUsBlock />

      {/* Business hours — always visible */}
      <div className="card p-4 mb-5 flex items-center gap-3 bg-amir-yellow/30">
        <Clock size={20} className="text-amir-dark/70 shrink-0" />
        <div className="text-sm">
          <p className="font-black">Business hours</p>
          <p className="text-amir-dark/60 font-semibold text-xs mt-0.5">
            Mon–Fri: 9am–6pm · Sat: 10am–4pm · Sun: Closed
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-5 justify-center">
        <button
          onClick={() => setTab('new')}
          className="px-4 py-2.5 rounded-full font-bold text-sm transition-colors bg-amir-pink hover:bg-pink-400 text-amir-dark shadow-sm inline-flex items-center gap-2"
        >
          <MessageCircle size={14} /> New message
        </button>
        <button
          onClick={() => setTab(tab === 'mine' ? null : 'mine')}
          className={`px-4 py-2.5 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${
            tab === 'mine'
              ? 'bg-amir-pink text-amir-dark shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <MessageSquare size={14} />
          My messages
          {myMessages.length > 0 && (
            <span className={`${tab === 'mine' ? 'bg-amir-dark/10' : 'bg-white'} px-1.5 rounded-full text-xs`}>
              {myMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* My messages shows inline */}
      {tab === 'mine' && <MyThreads messages={myMessages} isGuest={!user} />}

      {/* 📝 New message — full-screen modal */}
      {tab === 'new' && (
        <ContactFormModal
          user={user}
          onSend={feedback.sendMessage}
          onClose={() => setTab(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOCATE US BLOCK
   ═══════════════════════════════════════════════════════════ */
function LocateUsBlock() {
  const { lat, lng } = SHOP_INFO.coordinates;

  const mapEmbedUrl = `https://www.google.com/maps?q=${lat},${lng}&hl=en&z=16&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const isCurrentlyOpen = (() => {
    const now = new Date();
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const dayName = days[now.getDay() === 0 ? 6 : now.getDay() - 1];
    const today = SHOP_INFO.hours[dayName];
    if (!today) return false;
    const [oH, oM] = today[0].split(':').map(Number);
    const [cH, cM] = today[1].split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= oH * 60 + oM && nowMins < cH * 60 + cM;
  })();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
          <MapPin size={18} />
        </div>
        <div>
          <p className="font-black text-base text-amir-dark">Visit our shop</p>
          <p className="text-[11px] text-amir-dark/60 font-semibold">Come see us in person</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <iframe
          title="Shop location"
          src={mapEmbedUrl}
          className="w-full h-56 sm:h-72 border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-amir-dark/60 uppercase tracking-wider">
                Address
              </p>
              <p className="text-sm font-black text-amir-dark mt-0.5">
                {SHOP_INFO.address.street}
              </p>
              <p className="text-xs text-amir-dark/70 font-semibold">
                {SHOP_INFO.address.city}, {SHOP_INFO.address.country}
              </p>
            </div>

            <div className="shrink-0">
              <span className={`badge text-[10px] px-2 py-1 ${
                isCurrentlyOpen
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}>
                {isCurrentlyOpen ? '🟢 Open now' : '🔴 Closed now'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-amir-dark/5">
            <a
              href={`tel:${SHOP_INFO.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-amir-dark transition-colors"
            >
              <Phone size={12} /> {SHOP_INFO.phone}
            </a>
            <a
              href={`https://wa.me/${SHOP_INFO.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
            <a
              href={`mailto:${SHOP_INFO.email}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-amir-dark transition-colors"
            >
              <Mail size={12} /> Email
            </a>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2 text-sm"
          >
            <Navigation size={16} /> Get directions on Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Contact Form — Full-screen modal ─── */
function ContactFormModal({ user, onSend, onClose }) {
  const [form, setForm] = useState({
    name:    user?.name  || '',
    email:   user?.email || '',
    subject: 'General inquiry',
    message: '',
  });
  const [sent, setSent] = useState(null);

    const submit = async (e) => {
    e.preventDefault();
    
    const res = await onSend({ ...form, sentBy: user?.role || 'guest' });
    
    if (!res?.ok) {
      toast.error(res?.error || 'Failed to send message');
      return;
    }

    const entry = res.entry;

    // For guests, save the IDs to localStorage so they can see their messages
    if (!user) {
      try {
        const prev = JSON.parse(localStorage.getItem('amir_feedback_ids')) || [];
        localStorage.setItem('amir_feedback_ids', JSON.stringify([entry.id, ...prev].slice(0, 20)));
      } catch {}
    }
    
    setSent(entry);
    setForm({ ...form, message: '' });
    toast.success('Message sent!', { icon: '✉️' });
    setTimeout(() => onClose?.(), 2500);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-fade-in">

        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle size={20} className="text-amir-pink shrink-0" />
            <div className="min-w-0">
              <p className="font-black text-base">Send us a message</p>
              <p className="text-[11px] text-amir-dark/50 font-semibold">We usually reply within a few hours</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-9 h-9 hover:bg-rose-50 text-gray-400 hover:text-rose-500 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <p className="font-black text-lg mb-1">Message sent!</p>
              <p className="text-xs text-amir-dark/60 font-semibold mb-1">
                We received your message <span className="font-mono">{sent.id}</span>
              </p>
              <p className="text-[11px] text-amir-dark/50">
                Check <strong>"My messages"</strong> to see our reply once we respond.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                    Your name *
                  </label>
                  <input
                    required
                    className="input"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                    Email *
                  </label>
                  <input
                    required
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                  Subject
                </label>
                <select
                  className="input"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                >
                  <option>General inquiry</option>
                  <option>Order support</option>
                  <option>Product question</option>
                  <option>Return / refund</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                  Your message *
                </label>
                <textarea
                  required
                  rows={5}
                  className="input resize-none"
                  placeholder="How can we help?"
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1 py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-3"
                >
                  <Send size={16} /> Send message
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── My Threads ─── */
function MyThreads({ messages, isGuest }) {
  const [expanded, setExpanded] = useState(null);

  if (!messages.length) {
    return (
      <div className="card p-12 text-center">
        <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="font-bold">{isGuest ? 'No messages from this device' : 'No messages yet'}</p>
        <p className="text-xs text-amir-dark/60 mt-1">
          {isGuest ? 'Send us a message and it will show up here on this browser' : 'Send us a message and we\'ll reply here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map(m => {
        const replyCount = (m.replies || []).length;
        const isOpen = expanded === m.id;

        const statusMeta = replyCount > 0
          ? { label: 'Replied', cls: 'bg-blue-100 text-blue-700' }
          : m.status === 'resolved'
          ? { label: 'Resolved', cls: 'bg-emerald-100 text-emerald-700' }
          : { label: 'Waiting', cls: 'bg-amber-100 text-amber-700' };

        return (
          <div key={m.id} className="card overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : m.id)}
              className="w-full text-left p-3 active:bg-amir-cream/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0 flex items-center gap-1.5">
                  <p className="font-black text-xs font-mono truncate">{m.id}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {replyCount > 0 && (
                    <span className="badge text-[9px] px-1.5 bg-blue-100 text-blue-700 inline-flex items-center gap-1">
                      <MessageSquare size={10} /> {replyCount}
                    </span>
                  )}
                  <span className={`badge text-[9px] px-2 py-0.5 ${statusMeta.cls}`}>
                    {statusMeta.label}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-amir-dark/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              <p className="text-xs font-bold text-amir-dark truncate">{m.subject}</p>
              <p className="text-[10px] text-amir-dark/60 truncate mt-0.5">
                {m.message}
              </p>
            </button>

            {isOpen && (
              <div className="border-t border-amir-dark/5 p-3 sm:p-4 bg-amir-cream/30 animate-fade-in space-y-3">
                <p className="text-[10px] text-amir-dark/50 font-semibold">
                  Sent on {new Date(m.createdAt).toLocaleString([], {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>

                <div className="bg-white rounded-xl p-3 border border-amir-dark/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-1">
                    Your message
                  </p>
                  <p className="text-xs text-amir-dark/80 leading-relaxed whitespace-pre-wrap">
                    {m.message}
                  </p>
                </div>

                {replyCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 px-1">
                      {replyCount} repl{replyCount === 1 ? 'y' : 'ies'} from our team
                    </p>
                    {(m.replies || []).map(r => (
                      <div key={r.id} className="bg-amir-pink/20 rounded-xl p-3 border-l-4 border-amir-pink">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/70">
                            {r.author} · AMIR Team
                          </p>
                          <p className="text-[9px] text-amir-dark/50 font-semibold">
                            {new Date(r.createdAt).toLocaleString([], {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <p className="text-xs text-amir-dark/80 leading-relaxed whitespace-pre-wrap">
                          {r.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amir-dark/50 italic text-center py-2">
                    ⏳ Waiting for our team to reply
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAFF — Feedback Inbox
   ═══════════════════════════════════════════════════════════ */
function FeedbackInbox({ messages, counts, currentUser, onAddReply, onMarkRead, onMarkResolved, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const filtered = useMemo(() => {
    let list = [...messages];
    if (filter !== 'all') list = list.filter(m => m.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(m =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, filter, query]);

  const tabs = [
    { id: 'all',      label: 'All',      count: counts.total },
    { id: 'unread',   label: 'Unread',   count: counts.unread },
    { id: 'read',     label: 'Read',     count: counts.read },
    { id: 'resolved', label: 'Resolved', count: counts.resolved },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Inbox size={24} className="text-amir-pink" /> Feedback
          </h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold">
            Messages from customers and guests
          </p>
        </div>
        {counts.unread > 0 && (
          <span className="shrink-0 bg-rose-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full">
            {counts.unread} new
          </span>
        )}
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
            <span className={`text-[10px] px-1.5 rounded-full ${filter === t.id ? 'bg-amir-dark/10' : 'bg-gray-100'}`}>
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
          placeholder="Search by name, email, subject, or ID..."
          className="input pl-11 pr-11"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-amir-dark/40 hover:text-amir-dark hover:bg-amir-pink/20"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="font-bold">
            {filter === 'all' && !query ? 'No messages yet' : 'No matching messages'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const isOpen = expanded === m.id;
            const isReplying = replyingTo === m.id;
            const replyCount = (m.replies || []).length;

            const statusMeta = {
              unread:   { label: 'New',      cls: 'bg-rose-100 text-rose-700' },
              read:     { label: 'Read',     cls: 'bg-amber-100 text-amber-700' },
              resolved: { label: 'Resolved', cls: 'bg-emerald-100 text-emerald-700' },
            }[m.status] || { label: 'New', cls: 'bg-gray-100 text-gray-700' };

            const senderMeta = {
              guest:    { label: 'Guest',    cls: 'bg-gray-100 text-gray-600' },
              customer: { label: 'Customer', cls: 'bg-amir-pink/40 text-amir-dark' },
              sales:    { label: 'Sales',    cls: 'bg-amir-mint text-emerald-900' },
              owner:    { label: 'Owner',    cls: 'bg-amir-purple/60 text-amir-dark' },
            }[m.sentBy] || { label: 'Guest', cls: 'bg-gray-100 text-gray-600' };

            return (
              <div key={m.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="w-full text-left p-3 active:bg-amir-cream/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <p className="font-black text-xs font-mono truncate">{m.id}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {replyCount > 0 && (
                        <span className="badge text-[9px] px-1.5 bg-blue-100 text-blue-700 inline-flex items-center gap-1">
                          <MessageSquare size={10} /> {replyCount}
                        </span>
                      )}
                      <span className={`badge text-[9px] px-1.5 ${senderMeta.cls}`}>
                        {senderMeta.label}
                      </span>
                      <span className={`badge text-[9px] px-1.5 ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-amir-dark/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <User size={11} className="text-amir-dark/40 shrink-0" />
                    <p className="text-xs font-bold text-amir-dark truncate">
                      {m.name || 'Anonymous'}
                    </p>
                    <span className="text-[10px] text-amir-dark/40 shrink-0">·</span>
                    <p className="text-[10px] font-semibold text-amir-dark/60 truncate">
                      {m.subject}
                    </p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-amir-dark/5 p-3 sm:p-4 bg-amir-cream/30 animate-fade-in space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] text-amir-dark/50 font-semibold">
                        {new Date(m.createdAt).toLocaleString([], {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <p className="text-[10px] font-mono text-amir-dark/60 truncate">
                        {m.email}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-amir-dark/5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 mb-1">
                        Message
                      </p>
                      <p className="text-xs text-amir-dark/80 leading-relaxed whitespace-pre-wrap">
                        {m.message}
                      </p>
                    </div>

                    {replyCount > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 px-1">
                          Replies ({replyCount})
                        </p>
                        {(m.replies || []).map(r => (
                          <div key={r.id} className="bg-amir-pink/15 rounded-lg p-2.5 border-l-2 border-amir-pink">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/70">
                                {r.author} · AMIR Team
                              </p>
                              <p className="text-[9px] text-amir-dark/50 font-semibold">
                                {new Date(r.createdAt).toLocaleString([], {
                                  month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <p className="text-[11px] text-amir-dark/80 leading-relaxed whitespace-pre-wrap">
                              {r.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-amir-dark/5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setReplyingTo(isReplying ? null : m.id); }}
                        className={`flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all active:scale-95 ${
                          isReplying ? 'bg-gray-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        <Reply size={13} /> {isReplying ? 'Close' : replyCount > 0 ? 'Reply again' : 'Reply'}
                      </button>

                      {m.status === 'unread' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(m.id);
                            toast.success('Marked as read');
                          }}
                          className="flex-1 min-w-[100px] bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-full text-xs inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          Mark as read
                        </button>
                      )}

                      {m.status !== 'resolved' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkResolved(m.id);
                            toast.success('Marked as resolved');
                          }}
                          className="flex-1 min-w-[100px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-full text-xs inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <CheckCircle2 size={13} /> Resolve
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this message?')) {
                            onDelete(m.id);
                            toast.success('Message deleted', { icon: '🗑️' });
                            setExpanded(null);
                          }
                        }}
                        className="w-9 h-9 rounded-full bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {isReplying && (
                      <ReplyPanel
                        message={m}
                        currentUser={currentUser}
                        onSend={(text) => {
                          onAddReply(m.id, {
                            text,
                            author: currentUser?.name?.split(' ')[0] || 'Staff',
                            role: currentUser?.role || 'sales',
                          });
                          toast.success('Reply sent', { icon: '✅' });
                          setReplyingTo(null);
                        }}
                        onClose={() => setReplyingTo(null)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Reply Panel ─── */
function ReplyPanel({ message, currentUser, onSend, onClose }) {
  const [text, setText] = useState('');

  const templates = [
    { label: 'Thanks',       text: `Hi ${message.name},\n\nThank you for reaching out to AMIR BabyShop! We're looking into your message and will update you shortly.\n\nBest regards,\n${currentUser?.name || 'AMIR BabyShop Team'}` },
    { label: 'Order update', text: `Hi ${message.name},\n\nRegarding your recent order enquiry, we've checked our system and will be updating you on the status soon. Thank you for your patience!\n\nBest regards,\n${currentUser?.name || 'AMIR BabyShop Team'}` },
    { label: 'Resolved',     text: `Hi ${message.name},\n\nWe've resolved the issue you mentioned. Please let us know if there's anything else we can help with.\n\nBest regards,\n${currentUser?.name || 'AMIR BabyShop Team'}` },
  ];

  const handleSend = () => {
    if (!text.trim()) {
      toast.error('Please type a reply first');
      return;
    }
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="mt-3 pt-3 border-t border-amir-dark/5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50">
          Replying to {message.name || 'customer'}
        </p>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex gap-1.5 mb-2 overflow-x-auto hide-scrollbar">
        {templates.map((t, i) => (
          <button
            key={i}
            onClick={() => setText(t.text)}
            className="shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-amir-pink/20 hover:bg-amir-pink/40 text-amir-dark font-bold transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        placeholder={`Type your reply to ${message.name || 'customer'}...`}
        className="w-full px-3 py-2.5 rounded-lg border border-amir-dark/10 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-sm font-medium resize-none bg-white"
      />

      <div className="flex gap-1.5 mt-2">
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={14} /> Send reply
        </button>
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center py-2.5 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}