import { createContext, useContext, useEffect, useState } from 'react';
import { reviewService } from '../services/api';

const ReviewsContext = createContext();
export const useReviews = () => useContext(ReviewsContext);

const VOTES_KEY = 'amir_review_votes';

/* ─── Safe read helper ─── */
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
  const [reviews, setReviews] = useState([]);
  const [votes, setVotes] = useState(() => safeReadObject(VOTES_KEY));
  const [hydrated, setHydrated] = useState(false);

  /* ═══ INITIAL LOAD ═══ */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await reviewService.list();
        if (!cancelled) setReviews(list);
      } catch (err) {
        console.warn('[Reviews] load failed:', err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ═══ PERSIST VOTES ═══ */
  useEffect(() => {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  }, [votes]);

  /* ═══════════════ ADD REVIEW ═══════════════ */
  const addReview = ({ productId, rating, title, comment, image, photos = [], user }) => {
    const cleanPhotos = (photos || [])
      .filter(p => p && (p.full || typeof p === 'string'))
      .map(p => (typeof p === 'string' ? { full: p, thumb: p } : p))
      .slice(0, 5);

    const review = {
      id: `RV-${Date.now().toString().slice(-6)}`,
      productId,
      rating: Number(rating),
      title: (title || '').trim(),
      comment: (comment || '').trim(),
      image: (image || '').trim(),
      photos: cleanPhotos,
      authorName:  user?.name  || 'Guest',
      authorEmail: user?.email || null,
      authorRole:  user?.role  || 'guest',
      verified:    !!user,
      helpful:     0,
      notHelpful:  0,
      status:      'published',
      createdAt:   new Date().toISOString(),
      replies:     [],
    };

    setReviews(prev => [review, ...prev]);

    reviewService.create(review).catch(err =>
      console.warn('[Reviews] create failed:', err)
    );

    return review;
  };

  /* ═══════════════ DELETE ═══════════════ */
  const deleteReview = (id) => {
    setReviews(prev => prev.filter(r => r.id !== id));

    setVotes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    reviewService.remove(id).catch(err =>
      console.warn('[Reviews] remove failed:', err)
    );
  };

  /* ═══════════════ HIDE / PUBLISH ═══════════════ */
  const setReviewStatus = (id, status) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    reviewService.update(id, { status }).catch(err =>
      console.warn('[Reviews] status update failed:', err)
    );
  };

  /* ═══════════════ VOTE HELPFUL / NOT ═══════════════ */
  const voteReview = (id, type) => {
    const current = votes[id];

    if (current === type) {
      setVotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setReviews(prev => prev.map(r => {
        if (r.id !== id) return r;
        return {
          ...r,
          helpful:    type === 'up'   ? Math.max(0, r.helpful - 1)    : r.helpful,
          notHelpful: type === 'down' ? Math.max(0, r.notHelpful - 1) : r.notHelpful,
        };
      }));
      return;
    }

    setVotes(prev => ({ ...prev, [id]: type }));
    setReviews(prev => prev.map(r => {
      if (r.id !== id) return r;
      let helpful    = r.helpful;
      let notHelpful = r.notHelpful;
      if (current === 'up')   helpful    = Math.max(0, helpful - 1);
      if (current === 'down') notHelpful = Math.max(0, notHelpful - 1);
      if (type === 'up')      helpful    += 1;
      if (type === 'down')    notHelpful += 1;
      return { ...r, helpful, notHelpful };
    }));
  };

  const getUserVote = (id) => votes[id] || null;

  /* ═══════════════ STAFF REPLY ═══════════════ */
  const addReply = (id, { text, author, role }) => {
    const reply = {
      id: `RR-${Date.now().toString().slice(-6)}`,
      text: (text || '').trim(),
      author: author || 'Staff',
      role: role || 'owner',
      createdAt: new Date().toISOString(),
    };

    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, replies: [...(r.replies || []), reply] } : r
    ));

    return reply;
  };

  /* ═══════════════ PHOTO HELPERS ═══════════════ */

  const removePhoto = (reviewId, photoIndex) => {
    setReviews(prev => prev.map(r => {
      if (r.id !== reviewId) return r;
      const photos = [...(r.photos || [])];
      photos.splice(photoIndex, 1);
      return { ...r, photos };
    }));
  };

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
      .filter(r => r.productId === productId && r.status === 'published')
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
      addReview,
      deleteReview,
      setReviewStatus,
      voteReview,
      getUserVote,
      addReply,
      removePhoto,
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