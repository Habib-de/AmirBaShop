import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Baby, Calendar, Gift, Check, X, AlertCircle, Send,
  Package, Heart, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRegistry } from '../context/RegistryContext';
import { formatCurrency } from '../utils/format';
import SEO from '../components/SEO';
import RegistryItemCard from '../components/Registry/RegistryItemCard';

export default function RegistryView() {
  const { slug } = useParams();
  const { getBySlug, getStats, markGifted } = useRegistry();

  const registry = getBySlug(slug);
  const stats = registry ? getStats(registry.id) : null;

  const [giftingItem, setGiftingItem] = useState(null);
  const [giftForm, setGiftForm] = useState({ name: '', email: '', message: '' });
  const [error, setError] = useState('');

  /* ─── Not found ─── */
  if (!registry) {
    return (
      <>
        <SEO title="Registry Not Found" noIndex />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🍼</div>
          <h1 className="text-2xl font-black mb-2">Registry not found</h1>
          <p className="text-sm text-amir-dark/60 font-semibold mb-6">
            This registry may have been deleted or the link is incorrect
          </p>
          <Link to="/shop" className="btn-primary inline-flex">Browse the shop</Link>
        </div>
      </>
    );
  }

  const giftByItemId = new Map(registry.gifts.map(g => [g.itemId, g]));

  const openGiftModal = (item) => {
    setGiftingItem(item);
    setGiftForm({ name: '', email: '', message: '' });
    setError('');
  };

  const handleConfirmGift = () => {
    if (!giftForm.name.trim()) {
      setError('Please enter your name');
      return;
    }

    const res = markGifted(registry.id, giftingItem.id, {
      giverName: giftForm.name,
      giverEmail: giftForm.email,
      message: giftForm.message,
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }

    toast.success('Thank you for your gift!', { icon: '🎁' });
    setGiftingItem(null);
  };

  return (
    <>
      <SEO
        title={`${registry.babyName}'s Baby Registry`}
        description={`Help ${registry.ownerName} prepare for ${registry.babyName}. See what they need and gift something special.`}
        url={`/registry/${slug}`}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8 space-y-5">

        {/* ═══ HERO ═══ */}
        <div className="card p-5 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amir-pink/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-amir-purple/20 blur-3xl" />

          <div className="relative text-center">
            <div className="text-5xl mb-2">🍼</div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50">
              Baby Registry
            </p>
            <h1 className="text-3xl sm:text-4xl font-black mt-1 text-amir-dark">
              {registry.babyName}
            </h1>
            <p className="text-xs sm:text-sm text-amir-dark/70 font-semibold mt-2 flex items-center justify-center gap-1.5">
              <Calendar size={13} />
              Due {new Date(registry.dueDate).toLocaleDateString('en-KE', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
              {stats?.daysUntilDue !== null && stats.daysUntilDue > 0 && (
                <span className="text-emerald-600 font-bold">
                  · {stats.daysUntilDue} day{stats.daysUntilDue !== 1 ? 's' : ''} to go
                </span>
              )}
            </p>
            {registry.theme && (
              <p className="text-xs text-amir-dark/60 font-semibold mt-1">
                {registry.theme}
              </p>
            )}

            {registry.message && (
              <div className="bg-amir-cream/60 rounded-xl p-3 mt-4 max-w-lg mx-auto italic">
                <p className="text-xs text-amir-dark/80 leading-relaxed">
                  "{registry.message}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ PROGRESS ═══ */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amir-dark/70">
              🎁 {stats.giftedCount} of {stats.totalItems} items gifted
            </p>
            <p className="text-xs font-black text-amir-dark">{stats.progress}%</p>
          </div>
          <div className="h-2 bg-amir-cream rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amir-pink to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          {stats.remaining > 0 && (
            <p className="text-[11px] text-amir-dark/60 font-semibold mt-2">
              {stats.remaining} item{stats.remaining !== 1 ? 's' : ''} still needed · Total value {formatCurrency(stats.remainingValue)}
            </p>
          )}
        </div>

        {/* ═══ ITEMS GRID ═══ */}
        {registry.items.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-3">🛍️</div>
            <p className="font-bold">No items yet</p>
            <p className="text-xs text-amir-dark/60 mt-1">
              {registry.ownerName} hasn't added any items yet
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Package size={16} className="text-amir-pink" />
              <h2 className="text-lg font-black">
                Wanted gifts ({registry.items.length})
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {registry.items.map(item => (
                <RegistryItemCard
                  key={item.id}
                  item={item}
                  gift={giftByItemId.get(item.id) || null}
                  mode="guest"
                  onMarkGifted={openGiftModal}
                />
              ))}
            </div>
          </>
        )}

        {/* ═══ BROWSE CTA ═══ */}
        <div className="card p-5 text-center bg-gradient-to-br from-amir-pink/20 to-amir-purple/20">
          <Sparkles size={24} className="mx-auto text-amir-pink mb-2" />
          <p className="text-sm font-black text-amir-dark">Looking for something else?</p>
          <p className="text-xs text-amir-dark/60 font-semibold mt-1 mb-3">
            Browse the full shop to find more great gifts
          </p>
          <Link to="/shop" className="btn-primary inline-flex text-sm">
            Browse the shop
          </Link>
        </div>

      </div>

      {/* ═══ GIFT MODAL ═══ */}
      {giftingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setGiftingItem(null)} />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-black text-base flex items-center gap-2">
                  <Gift size={16} className="text-amir-pink" />
                  Gift this item
                </p>
                <p className="text-[11px] text-amir-dark/50 truncate">
                  {giftingItem.name}
                </p>
              </div>
              <button
                onClick={() => setGiftingItem(null)}
                className="btn-icon w-9 h-9 hover:bg-rose-50 text-gray-400 hover:text-rose-500 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">

              <div className="bg-amir-pink/10 rounded-xl p-3 flex items-center gap-3">
                <img
                  src={giftingItem.image}
                  alt={giftingItem.name}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amir-dark truncate">
                    {giftingItem.name}
                  </p>
                  <p className="text-sm font-black text-amir-dark mt-0.5">
                    {formatCurrency(giftingItem.price)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                  Your name *
                </label>
                <input
                  type="text"
                  value={giftForm.name}
                  onChange={e => setGiftForm({ ...giftForm, name: e.target.value })}
                  placeholder="e.g. Jane Mwangi"
                  maxLength={60}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                  Email <span className="text-amir-dark/40 normal-case">(optional)</span>
                </label>
                <input
                  type="email"
                  value={giftForm.email}
                  onChange={e => setGiftForm({ ...giftForm, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                  Message <span className="text-amir-dark/40 normal-case">(optional)</span>
                </label>
                <textarea
                  value={giftForm.message}
                  onChange={e => setGiftForm({ ...giftForm, message: e.target.value })}
                  rows={3}
                  maxLength={200}
                  placeholder="A little note for the parents 💕"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-xs font-medium resize-none bg-white"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-xs text-rose-600 font-semibold">{error}</p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                  💡 This just <strong>reserves</strong> the item so others don't gift the same thing. You'll still need to purchase it — either in the shop or at our physical location.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGiftingItem(null)}
                  className="flex-1 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGift}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-all active:scale-[0.99]"
                >
                  <Send size={14} /> Confirm
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}