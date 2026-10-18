import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Baby, Copy, Share2, Plus, Edit3, Eye, Gift, Check,
  TrendingUp, Heart, Trash2, Package, MessageCircle,
  Calendar, AlertCircle, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRegistry } from '../context/RegistryContext';
import { formatCurrency } from '../utils/format';
import SEO from '../components/SEO';
import RegistryItemCard from '../components/Registry/RegistryItemCard';

export default function MyRegistry() {
  const { user } = useAuth();
  const {
    getMyRegistry, getStats, removeItem, updateItem,
    unmarkGifted, markThanked, deleteRegistry,
  } = useRegistry();
  const navigate = useNavigate();

  const [tab, setTab] = useState('items'); // 'items' | 'gifts'
  const [confirmDelete, setConfirmDelete] = useState(false);

  const registry = getMyRegistry();
  const stats = registry ? getStats(registry.id) : null;

  if (!user) {
    return (
      <>
        <SEO title="My Registry" url="/my-registry" noIndex />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-3">Sign in to view your registry</h1>
          <Link to="/login" className="btn-primary inline-flex">Sign in</Link>
        </div>
      </>
    );
  }

  /* ─── No registry yet ─── */
  if (!registry) {
    return (
      <>
        <SEO title="My Registry" url="/my-registry" noIndex />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🍼</div>
          <h1 className="text-2xl font-black mb-2">No registry yet</h1>
          <p className="text-sm text-amir-dark/60 font-semibold mb-6">
            Create a registry and share it with friends & family
          </p>
          <Link to="/registry" className="btn-primary inline-flex">
            <Plus size={16} /> Create my registry
          </Link>
        </div>
      </>
    );
  }

  /* ─── Share link ─── */
  const shareUrl = `${window.location.origin}/registry/${registry.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!', { icon: '📋' });
  };

  const handleWhatsAppShare = () => {
    const message =
      `🍼 *${registry.babyName}'s Baby Registry*\n\n` +
      `Due: ${new Date(registry.dueDate).toLocaleDateString('en-KE', {
        month: 'long', day: 'numeric', year: 'numeric',
      })}\n` +
      (registry.theme ? `Theme: ${registry.theme}\n` : '') +
      `\nSee what we need and gift something special 💕\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

    const handleRemove = async (item) => {
    if (!confirm(`Remove "${item.name}" from your registry?`)) return;
    const res = await removeItem(registry.id, item.id);
    if (!res.ok) {
      toast.error(res.error || 'Could not remove item', { icon: '⚠️' });
      return;
    }
    toast.success('Removed from registry', { icon: '🗑️' });
  };

    const handlePriority = async (item, priority) => {
    const res = await updateItem(registry.id, item.id, { priority });
    if (!res.ok) {
      toast.error(res.error || 'Could not update priority', { icon: '⚠️' });
    }
  };

    const handleUnmarkGift = async (gift) => {
    if (!confirm(`Undo "${gift.giverName}" gift on "${gift.itemName}"?`)) return;
    const res = await unmarkGifted(registry.id, gift.id);
    if (!res.ok) {
      toast.error(res.error || 'Could not undo gift', { icon: '⚠️' });
      return;
    }
    toast.success('Gift undone', { icon: '↩️' });
  };

    const handleThanks = async (gift, thanked) => {
    const res = await markThanked(registry.id, gift.id, thanked);
    if (!res.ok) {
      toast.error(res.error || 'Could not update thanks', { icon: '⚠️' });
      return;
    }
    toast.success(thanked ? 'Marked as thanked' : 'Marked as not thanked', { icon: '💌' });
  };

   const handleDelete = async () => {
    if (!confirm(`Delete your entire registry? This cannot be undone.`)) return;
    const res = await deleteRegistry(registry.id);
    if (!res.ok) {
      toast.error(res.error || 'Could not delete registry', { icon: '⚠️' });
      return;
    }
    toast.success('Registry deleted', { icon: '🗑️' });
    navigate('/profile');
  };

  const giftByItemId = new Map(registry.gifts.map(g => [g.itemId, g]));

  return (
    <>
      <SEO title="My Baby Registry" url="/my-registry" noIndex />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8 space-y-5">

        {/* ═══ HEADER CARD ═══ */}
        <div className="card p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amir-pink/30 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/50 flex items-center gap-1">
                  <Baby size={11} /> Baby Registry
                </p>
                <h1 className="text-2xl sm:text-3xl font-black mt-0.5 truncate">
                  {registry.babyName}
                </h1>
                <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-1 flex items-center gap-1.5">
                  <Calendar size={12} />
                  Due {new Date(registry.dueDate).toLocaleDateString('en-KE', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                  {stats?.daysUntilDue !== null && stats.daysUntilDue > 0 && (
                    <span className="text-emerald-600 font-bold">
                      · {stats.daysUntilDue} day{stats.daysUntilDue !== 1 ? 's' : ''} to go
                    </span>
                  )}
                  {stats?.isPastDue && (
                    <span className="text-rose-600 font-bold">· Past due</span>
                  )}
                </p>
                {registry.theme && (
                  <p className="text-xs text-amir-dark/70 font-semibold mt-1">
                    {registry.theme}
                  </p>
                )}
              </div>
            </div>

            {registry.message && (
              <div className="bg-amir-cream/60 rounded-xl p-3 mb-4 italic">
                <p className="text-xs text-amir-dark/80 leading-relaxed">
                  "{registry.message}"
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-amir-pink text-amir-dark font-bold text-xs transition-colors"
              >
                <Copy size={13} /> Copy link
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors"
              >
                <Share2 size={13} /> Share on WhatsApp
              </button>
              <Link
                to={`/registry/${registry.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-amir-pink text-amir-dark font-bold text-xs transition-colors"
              >
                <Eye size={13} /> Preview
              </Link>
              <Link
                to="/registry"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-amir-pink text-amir-dark font-bold text-xs transition-colors"
              >
                <Edit3 size={13} /> Edit info
              </Link>
            </div>
          </div>
        </div>

        {/* ═══ STATS ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard icon={Package} label="Items" value={stats.totalItems} sub={`${stats.remaining} remaining`} color="blue" />
          <StatCard icon={Gift} label="Gifted" value={stats.giftedCount} sub={`${stats.progress}% complete`} color="emerald" />
          <StatCard icon={TrendingUp} label="Total value" value={formatCurrency(stats.totalValue)} sub={`${formatCurrency(stats.remainingValue)} left`} color="amber" />
          {stats.completionDiscount > 0 ? (
            <StatCard
              icon={Heart}
              label="Completion discount"
              value="10% OFF"
              sub="Apply at checkout"
              color="pink"
              highlight
            />
          ) : (
            <StatCard
              icon={Heart}
              label="Thank-yous"
              value={registry.gifts.filter(g => g.thanked).length}
              sub={`of ${registry.gifts.length} sent`}
              color="pink"
            />
          )}
        </div>

        {/* ═══ PROGRESS BAR ═══ */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amir-dark/70">
              {stats.giftedCount} of {stats.totalItems} items gifted
            </p>
            <p className="text-xs font-black text-amir-dark">{stats.progress}%</p>
          </div>
          <div className="h-2 bg-amir-cream rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amir-pink to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setTab('items')}
            className={`px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-colors ${
              tab === 'items' ? 'bg-amir-pink text-amir-dark shadow-sm' : 'text-gray-500 hover:bg-amir-pink/10'
            }`}
          >
            <Package size={12} className="inline mr-1" />
            Items ({registry.items.length})
          </button>
          <button
            onClick={() => setTab('gifts')}
            className={`px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-colors ${
              tab === 'gifts' ? 'bg-amir-pink text-amir-dark shadow-sm' : 'text-gray-500 hover:bg-amir-pink/10'
            }`}
          >
            <Gift size={12} className="inline mr-1" />
            Gifts received ({registry.gifts.length})
          </button>
        </div>

        {/* ═══ ITEMS TAB ═══ */}
        {tab === 'items' && (
          <>
            {registry.items.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-3">🛍️</div>
                <p className="font-bold">No items yet</p>
                <p className="text-xs text-amir-dark/60 mt-1 mb-5">
                  Browse the shop and add items you'd like to receive
                </p>
                <Link to="/shop" className="btn-primary inline-flex text-sm">
                  <Plus size={14} /> Add products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {registry.items.map(item => (
                  <RegistryItemCard
                    key={item.id}
                    item={item}
                    gift={giftByItemId.get(item.id) || null}
                    mode="owner"
                    onRemove={handleRemove}
                    onChangePriority={handlePriority}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ GIFTS TAB ═══ */}
        {tab === 'gifts' && (
          <>
            {registry.gifts.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-3">🎁</div>
                <p className="font-bold">No gifts yet</p>
                <p className="text-xs text-amir-dark/60 mt-1">
                  Share your registry link to start receiving gifts
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {registry.gifts.map(gift => (
                  <div key={gift.id} className="card p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <p className="font-bold text-sm text-amir-dark">{gift.giverName}</p>
                          {gift.thanked && (
                            <span className="badge bg-emerald-100 text-emerald-700 text-[9px] px-1.5 inline-flex items-center gap-0.5">
                              <Check size={9} /> Thanked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-amir-dark/60 font-semibold">
                          Gifted "{gift.itemName}"
                        </p>
                        {gift.message && (
                          <p className="text-[11px] text-amir-dark/70 italic mt-1 leading-relaxed">
                            "{gift.message}"
                          </p>
                        )}
                        <p className="text-[10px] text-amir-dark/40 font-semibold mt-1">
                          {new Date(gift.giftedAt).toLocaleString([], {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>

                        {gift.orderId ? (
                          <Link
                            to="/orders"
                            className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 text-[10px] font-bold transition-colors"
                          >
                            <Package size={10} /> Order {gift.orderId}
                            <ExternalLink size={8} />
                          </Link>
                        ) : (
                          <p className="text-[10px] text-amir-dark/40 font-semibold mt-1 italic">
                            Reserved · not yet purchased
                          </p>
                        )}
                      </div>

                        <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => handleThanks(gift, !gift.thanked)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
                            gift.thanked
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-amir-pink/30 text-amir-dark hover:bg-amir-pink/50'
                          }`}
                        >
                          <MessageCircle size={10} /> {gift.thanked ? 'Thanked' : 'Mark thanked'}
                        </button>
                        <button
                          onClick={() => handleUnmarkGift(gift)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 text-[10px] font-bold transition-colors"
                        >
                          <Trash2 size={10} /> Undo
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ DELETE ZONE ═══ */}
        <div className="card p-4 border-l-4 border-l-rose-300 mt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-900">Delete registry</p>
              <p className="text-[11px] text-gray-500">This removes the registry and all tracked gifts. Cannot be undone.</p>
            </div>
            <button
              onClick={handleDelete}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

/* ─── Stat card helper ─── */
function StatCard({ icon: Icon, label, value, sub, color = 'blue', highlight = false }) {
  const colors = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600'    },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600'   },
    pink:    { bg: 'bg-pink-50',    text: 'text-pink-600'    },
  }[color] || { bg: 'bg-gray-50', text: 'text-gray-600' };

  return (
    <div className={`bg-white p-3 sm:p-4 rounded-xl shadow-sm border ${
      highlight ? 'border-amir-pink ring-2 ring-amir-pink/20' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold truncate">
            {label}
          </p>
          <p className="text-base sm:text-lg font-bold mt-1 truncate text-gray-900">
            {value}
          </p>
          <p className="text-[10px] text-gray-500 truncate mt-0.5">
            {sub}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} shrink-0`}>
          <Icon size={14} />
        </div>
      </div>
    </div>
  );
}