import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Trash2, CheckCircle2, MessageSquare, Reply, Send, X, ChevronDown, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReviews } from '../../context/ReviewsContext';
import { useAuth } from '../../context/AuthContext';
import { useExtras } from '../../context/ExtrasContext';

export default function ReviewCard({ review }) {
  const { voteReview, getUserVote, deleteReview, setReviewStatus, addReply } = useReviews();
  const { user, isStaff, isOwner } = useAuth();
  const { notify } = useExtras();

  const [showReplies, setShowReplies] = useState(true);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const userVote = getUserVote(review.id);
  const replyCount = (review.replies || []).length;
  const photos = review.photos || [];

  const isAuthor = user?.email && review.authorEmail === user.email.toLowerCase();
  const canModerate = isStaff;
  const canReply = isStaff;

  const handleVote = (type) => {
    voteReview(review.id, type);
  };

  const handleDelete = () => {
    if (confirm('Delete this review? This cannot be undone.')) {
      deleteReview(review.id);
      toast.success('Review deleted', { icon: '🗑️' });
    }
  };

  const handleHide = () => {
    setReviewStatus(review.id, review.status === 'hidden' ? 'published' : 'hidden');
    toast.success(review.status === 'hidden' ? 'Review published' : 'Review hidden');
  };

  const handleSendReply = () => {
    if (!replyText.trim()) {
      toast.error('Type a reply first');
      return;
    }

    const text = replyText.trim();

    addReply(review.id, {
      text,
      author: user?.name?.split(' ')[0] || 'Staff',
      role: user?.role || 'owner',
    });

    if (review.authorEmail) {
      notify(review.authorEmail, {
        type: 'review',
        title: 'New reply to your review',
        body: `${user?.name || 'AMIR Team'} replied: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`,
        link: `/product/${review.productId}`,
      });
    }

    setReplyText('');
    setReplying(false);
    toast.success('Reply added', { icon: '✅' });
  };

  /* ─── Lightbox navigation ─── */
  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex(i => (i - 1 + photos.length) % photos.length);
  const nextPhoto = () => setLightboxIndex(i => (i + 1) % photos.length);

  const initial = (review.authorName || '?').charAt(0).toUpperCase();
  const avatarColor =
    review.authorRole === 'owner' ? 'bg-amir-purple' :
    review.authorRole === 'sales' ? 'bg-emerald-500' :
    review.authorRole === 'guest' ? 'bg-gray-400' :
    'bg-amir-pink';

  const relTime = (() => {
    const diff = Date.now() - new Date(review.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  })();

  return (
    <>
      <div className={`card p-3 sm:p-4 ${review.status === 'hidden' ? 'opacity-60 border-l-4 border-l-gray-400' : ''}`}>

        {review.status === 'hidden' && canModerate && (
          <div className="mb-2 px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-600 uppercase tracking-wider inline-block">
            🚫 Hidden from customers
          </div>
        )}

        <div className="flex items-start gap-3 mb-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${avatarColor}`}>
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
              <p className="font-bold text-sm text-amir-dark truncate">
                {review.authorName || 'Guest'}
              </p>
              {review.verified && (
                <span className="badge bg-emerald-100 text-emerald-700 text-[9px] px-1.5 inline-flex items-center gap-0.5">
                  <CheckCircle2 size={9} /> Verified
                </span>
              )}
              {isAuthor && (
                <span className="badge bg-amir-pink/40 text-amir-dark text-[9px] px-1.5">
                  You
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <span
                    key={i}
                    className={`text-sm leading-none ${
                      i <= review.rating ? 'text-amber-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-amir-dark/50 font-semibold">
                {relTime}
              </span>
            </div>
          </div>

          {canModerate && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleHide}
                className="w-7 h-7 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors"
                title={review.status === 'hidden' ? 'Publish' : 'Hide'}
                aria-label={review.status === 'hidden' ? 'Publish' : 'Hide'}
              >
                {review.status === 'hidden' ? '👁️' : '🚫'}
              </button>
              <button
                onClick={handleDelete}
                className="w-7 h-7 rounded-full hover:bg-rose-50 text-rose-500 flex items-center justify-center transition-colors"
                title="Delete"
                aria-label="Delete review"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {review.title && (
          <h4 className="font-bold text-sm text-amir-dark mb-1 leading-tight">
            {review.title}
          </h4>
        )}

        {review.comment && (
          <p className="text-xs sm:text-sm text-amir-dark/75 leading-relaxed whitespace-pre-wrap">
            {review.comment}
          </p>
        )}

        {photos.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1 mb-1.5">
              <Camera size={11} className="text-amir-dark/50" />
              <span className="text-[10px] font-bold text-amir-dark/50 uppercase tracking-wider">
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => openLightbox(i)}
                  className="aspect-square rounded-lg overflow-hidden bg-amir-cream border border-amir-dark/5 hover:opacity-90 transition-opacity active:scale-95"
                  aria-label={`View photo ${i + 1}`}
                >
                  <img
                    src={p.thumb || p.full || p}
                    alt={`Review photo ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {review.image && photos.length === 0 && (
          <div className="mt-2">
            <img
              src={review.image}
              alt="Review"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover border border-amir-dark/5"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-amir-dark/5">
          <span className="text-[10px] font-bold text-amir-dark/50 uppercase tracking-wider">
            Helpful?
          </span>

          <button
            onClick={() => handleVote('up')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
              userVote === 'up'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
            }`}
          >
            <ThumbsUp size={11} /> {review.helpful || 0}
          </button>

          <button
            onClick={() => handleVote('down')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
              userVote === 'down'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            <ThumbsDown size={11} /> {review.notHelpful || 0}
          </button>

          {replyCount > 0 && (
            <button
              onClick={() => setShowReplies(v => !v)}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-amir-dark/60 hover:text-amir-dark"
            >
              <MessageSquare size={11} /> {replyCount}
              <ChevronDown size={10} className={`transition-transform ${showReplies ? 'rotate-180' : ''}`} />
            </button>
          )}

          {canReply && (
            <button
              onClick={() => setReplying(v => !v)}
              className={`${replyCount > 0 ? '' : 'ml-auto'} inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                replying
                  ? 'bg-gray-800 text-white'
                  : 'bg-amir-pink/30 text-amir-dark hover:bg-amir-pink/50'
              }`}
            >
              <Reply size={11} /> {replying ? 'Close' : 'Reply'}
            </button>
          )}
        </div>

        {showReplies && replyCount > 0 && (
          <div className="mt-3 space-y-2 pl-3 border-l-2 border-amir-pink/30">
            {(review.replies || []).map(r => (
              <div key={r.id} className="bg-amir-pink/10 rounded-lg p-2.5">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amir-dark/70">
                    {r.author} · AMIR Team
                  </p>
                  <p className="text-[9px] text-amir-dark/50 font-semibold">
                    {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className="text-[11px] text-amir-dark/80 leading-relaxed whitespace-pre-wrap">
                  {r.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {replying && (
          <div className="mt-3 pt-3 border-t border-amir-dark/5 animate-fade-in">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={3}
              placeholder="Type your reply as AMIR Team..."
              className="w-full px-3 py-2 rounded-lg border border-amir-dark/10 focus:border-amir-pink focus:ring-2 focus:ring-amir-pink/30 outline-none text-xs font-medium resize-none bg-white"
            />
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
              >
                <Send size={12} /> Send reply
              </button>
              <button
                onClick={() => { setReplying(false); setReplyText(''); }}
                className="inline-flex items-center justify-center gap-1 py-2 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={22} />
          </button>

          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          <img
            src={photos[lightboxIndex].full || photos[lightboxIndex]}
            alt={`Review photo ${lightboxIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold">
            by {review.authorName || 'Guest'}
          </div>
        </div>
      )}
    </>
  );
}