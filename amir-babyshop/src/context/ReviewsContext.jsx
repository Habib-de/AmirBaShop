import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { reviewService } from '../services/api';
import { useAuth } from './AuthContext';

const ReviewsContext = createContext();
export const useReviews = () => useContext(ReviewsContext);

/* Guest vote choices kept client-side so we know which vote is "yours". */
const VOTES_KEY = 'amir_review_votes';

function safeReadObject(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function ReviewsProvider({ children }) {
  const { user, isStaff } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [votes, setVotes] = useState(() => safeReadObject(VOTES_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ═══ INITIAL LOAD ═══ */
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await reviewService.list();
      setReviews(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('[Reviews] load failed:', err);
      setError(err?.message || 'Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload, user?.id]);

  /* ═══ PERSIST LOCAL VOTES ═══ */
  useEffect(() => {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  }, [votes]);

  /* ═══════════════ ADD REVIEW ═══════════════ */
  const addReview = async ({ productId, rating, title, comment, image, photos = [] }) => {
    try {
      const created = await reviewService.create({
        productId,
        rating: Number(rating),
        title,
        comment,
        image,
        photos,
      });
      setReviews(prev => [created, ...prev]);
      return { ok: true, review: created };
    } catch (err) {
      console.error('[Reviews] create failed:', err);
      return { ok: false, error: err?.message || 'Failed to submit review' };
    }
  };

  /* ═══════════════ DELETE ═══════════════ */
  const deleteReview = async (id) => {
    const prev = reviews;
    setReviews(list => list.filter(r => r.id !== id));
    try {
      await reviewService.remove(id);
      setVotes(v => {
        const n = { ...v };
        delete n[id];
        return n;
      });
      return { ok: true };
    } catch (err) {
      console.error('[Reviews] delete failed:', err);
      setReviews(prev);
      return { ok: false, error: err?.message || 'Delete failed' };
    }
  };

  /* ═══════════════ MODERATE (staff) ═══════════════ */
  const setReviewStatus = async (id, status) => {
    try {
      const updated = await reviewService.setStatus(id, status);
      setReviews(list => list.map(r => r.id === id ? updated : r));
      return { ok: true };
    } catch (err) {
      console.error('[Reviews] setStatus failed:', err);
      return { ok: false, error: err?.message || 'Moderation failed' };
    }
  };

  /* ═══════════════ VOTE ═══════════════ */
  const voteReview = async (id, type) => {
    const current = votes[id];

    /* Clicking the same vote = toggle off, still sends to backend */
    const nextVote = current === type ? type : type;

    try {
      const updated = await reviewService.vote(id, nextVote);
      setReviews(list => list.map(r => r.id === id ? updated : r));

      setVotes(prev => {
        const next = { ...prev };
        if (current === type) delete next[id];
        else next[id] = type;
        return next;
      });
      return { ok: true };
    } catch (err) {
      console.error('[Reviews] vote failed:', err);
      return { ok: false, error: err?.message || 'Vote failed' };
    }
  };

  const getUserVote = (id) => votes[id] || null;

  /* ═══════════════ STAFF REPLY ═══════════════ */
  const addReply = async (id, { text }) => {
    try {
      const updated = await reviewService.reply(id, text);
      setReviews(list => list.map(r => r.id === id ? updated : r));
      return { ok: true };
    } catch (err) {
      console.error('[Reviews] reply failed:', err);
      return { ok: false, error: err?.message || 'Reply failed' };
    }
  };

  /* ═══════════════ PHOTO HELPERS ═══════════════ */

  const getPhotosByProduct = (productId) => {
    return reviews
      .filter(r => r.productId === productId && r.status === 'published')
      .flatMap(r =>
        (r.photos || []).map((p, idx) => ({
          reviewId: r.id,
          authorName: r.authorName,
          index: idx,
          full: p.full || p,
          thumb: p.thumb || p.full || p,
        }))
      );
  };

  /* ═══════════════ QUERIES ═══════════════ */
    const getByProduct = (productId) =>
    reviews
      .filter(r => {
        if (r.productId !== productId) return false;
        if (r.status === 'published') return true;
        return isStaff;   // staff see hidden reviews too, so they can re-publish
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getAllByProduct = (productId) =>
    reviews
      .filter(r => r.productId === productId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getStats = (productId) => {
    const list = getByProduct(productId);
    if (!list.length) return { avg: 0, count: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    list.forEach(r => {
      sum += r.rating;
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });
    return {
      avg: Math.round((sum / list.length) * 10) / 10,
      count: list.length,
      breakdown,
    };
  };

  const hasReviewed = (productId, email) => {
    if (!email) return false;
    return reviews.some(
      r => r.productId === productId && r.authorEmail === email.toLowerCase()
    );
  };

  const counts = {
    total:     reviews.length,
    published: reviews.filter(r => r.status === 'published').length,
    hidden:    reviews.filter(r => r.status === 'hidden').length,
  };

  return (
    <ReviewsContext.Provider value={{
      reviews,
      loading,
      error,
      reload,
      addReview,
      deleteReview,
      setReviewStatus,
      voteReview,
      getUserVote,
      addReply,
      getPhotosByProduct,
      getByProduct,
      getAllByProduct,
      getStats,
      hasReviewed,
      counts,
    }}>
      {children}
    </ReviewsContext.Provider>
  );
}