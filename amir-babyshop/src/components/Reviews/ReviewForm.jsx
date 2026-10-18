import { useState, useRef } from 'react';
import { Star, X, Send, Camera, AlertCircle, ImagePlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReviews } from '../../context/ReviewsContext';
import { useAuth } from '../../context/AuthContext';
import { processPhotoFiles, MAX_PHOTOS, formatBytes } from '../../utils/imageHelpers';

export default function ReviewForm({ product, onClose }) {
  const { addReview } = useReviews();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeRating = hoverRating || rating;
  const remainingSlots = MAX_PHOTOS - photos.length;

  const handlePickPhotos = () => {
    if (remainingSlots <= 0) {
      toast.error(`Max ${MAX_PHOTOS} photos per review`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFiles = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessing(true);
    setError('');

    try {
      const { ok, errors } = await processPhotoFiles(files, photos.length);

      if (errors.length) {
        errors.forEach(msg => toast.error(msg));
      }

      if (ok.length) {
        setPhotos(prev => [...prev, ...ok]);
        toast.success(`${ok.length} photo${ok.length !== 1 ? 's' : ''} added`, { icon: '📷' });
      }
    } catch (err) {
      console.error('[ReviewForm] photo processing failed:', err);
      setError('Could not process one or more photos');
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
    try {
      const res = await addReview({
        productId: product.id,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        photos,
        user,
      });

      if (!res.ok) {
        setError(res.error || 'Could not submit review');
        toast.error(res.error || 'Could not submit review', { icon: '⚠️' });
        return;
      }

      toast.success('Thanks for your review!', { icon: '⭐' });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not submit review');
      toast.error(err?.message || 'Could not submit review', { icon: '⚠️' });
    } finally {
      setSubmitting(false);
    }
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60">
              Photos <span className="text-amir-dark/40 normal-case font-semibold">(optional · up to {MAX_PHOTOS})</span>
            </label>
            <span className="text-[10px] font-bold text-amir-dark/50">
              {photos.length} / {MAX_PHOTOS}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-amir-cream border border-amir-dark/5 group"
                >
                  <img
                    src={p.thumb || p.full}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-500 text-white flex items-center justify-center transition-colors opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X size={12} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-0.5">
                    <p className="text-[9px] font-bold text-white">
                      {formatBytes(p.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {remainingSlots > 0 && (
            <button
              type="button"
              onClick={handlePickPhotos}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-amir-pink hover:bg-amir-pink/5 text-sm font-bold text-amir-dark/70 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing photos...
                </>
              ) : (
                <>
                  <ImagePlus size={16} />
                  {photos.length === 0 ? 'Add photos' : `Add more (${remainingSlots} left)`}
                </>
              )}
            </button>
          )}

          <p className="text-[10px] text-amir-dark/40 mt-1.5 leading-snug">
            📷 Photos are auto-compressed to save space. Max {MAX_PHOTOS} per review.
          </p>
        </div>

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

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle size={14} className="text-rose-500 shrink-0" />
            <p className="text-xs text-rose-600 font-semibold">{error}</p>
          </div>
        )}

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
            disabled={submitting || processing}
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