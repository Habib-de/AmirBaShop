import { useState } from 'react';
import { Star, X, Send, ImageIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReviews } from '../../context/ReviewsContext';
import { useAuth } from '../../context/AuthContext';

export default function ReviewForm({ product, onClose }) {
  const { addReview } = useReviews();
  const { user } = useAuth();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeRating = hoverRating || rating;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // ── Validation ──
    if (!rating || rating < 1) {
      setError('Please choose a star rating');
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      setError('Please write at least 10 characters');
      return;
    }
    if (comment.trim().length > 1000) {
      setError('Comment is too long (max 1000 characters)');
      return;
    }
    if (title.trim().length > 80) {
      setError('Title is too long (max 80 characters)');
      return;
    }

    setSubmitting(true);

    // Simulate a small delay for nicer UX
    setTimeout(() => {
      addReview({
        productId: product.id,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        image: image.trim(),
        user,
      });
      toast.success('Thanks for your review!', { icon: '⭐' });
      setSubmitting(false);
      onClose?.();
    }, 350);
  };

  const ratingLabels = {
    1: '😞 Poor',
    2: '😐 Fair',
    3: '🙂 Good',
    4: '😊 Very good',
    5: '🤩 Excellent',
  };

  return (
    <div className="card p-4 sm:p-5 mb-5 border-l-4 border-amir-pink animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="font-black text-base sm:text-lg leading-tight">
            Write a review
          </h3>
          <p className="text-[11px] sm:text-xs text-amir-dark/60 font-semibold mt-0.5 truncate">
            {product.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center transition-colors shrink-0"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ─── Star picker ─── */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-2">
            Your rating *
          </label>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                className="active:scale-90 transition-transform"
                aria-label={`${i} star${i !== 1 ? 's' : ''}`}
              >
                <Star
                  size={32}
                  className={
                    i <= activeRating
                      ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                      : 'text-gray-300 hover:text-amber-200'
                  }
                />
              </button>
            ))}

            {activeRating > 0 && (
              <span className="ml-2 text-xs sm:text-sm font-bold text-amir-dark/70">
                {ratingLabels[activeRating]}
              </span>
            )}
          </div>
        </div>

        {/* ─── Title (optional) ─── */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
            Review title <span className="text-amir-dark/40 normal-case font-semibold">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Sum it up in a few words"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink focus:outline-none text-sm font-semibold bg-white"
          />
          {title.length > 0 && (
            <p className="text-[10px] text-amir-dark/40 mt-0.5 text-right">
              {title.length}/80
            </p>
          )}
        </div>

        {/* ─── Comment ─── */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
            Your review *
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="What did you like or dislike? How was the quality, size, and delivery?"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amir-pink focus:outline-none text-sm font-medium resize-none bg-white leading-relaxed"
          />
          <p className="text-[10px] text-amir-dark/40 mt-0.5 text-right">
            {comment.length}/1000
          </p>
        </div>

        {/* ─── Image URL (optional) ─── */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
            Add a photo <span className="text-amir-dark/40 normal-case font-semibold">(optional)</span>
          </label>
          <div className="relative">
            <ImageIcon
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="url"
              value={image}
              onChange={e => setImage(e.target.value)}
              placeholder="https://... (paste an image URL)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink focus:outline-none text-sm font-semibold bg-white"
            />
          </div>

          {/* Preview */}
          {image && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={image}
                alt="Preview"
                className="w-16 h-16 rounded-xl object-cover border border-amir-dark/10"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <p className="text-[10px] text-amir-dark/50 font-semibold">
                Image preview
              </p>
            </div>
          )}
        </div>

        {/* ─── Signed-in-as notice ─── */}
        <div className="bg-amir-cream/60 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-base shrink-0">
            {user ? '👤' : '👻'}
          </span>
          <p className="text-[11px] text-amir-dark/70 font-semibold leading-snug">
            {user
              ? <>Posting as <strong>{user.name}</strong> · <span className="text-emerald-600">✅ Verified</span></>
              : <>Posting as <strong>Guest</strong> · Sign in to get a verified badge</>}
          </p>
        </div>

        {/* ─── Error ─── */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle size={14} className="text-rose-500 shrink-0" />
            <p className="text-xs text-rose-600 font-semibold">{error}</p>
          </div>
        )}

        {/* ─── Actions ─── */}
        <div className="flex gap-2 pt-2 border-t border-amir-dark/5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-amir-dark border-t-transparent animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send size={14} /> Post review
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}