import { createContext, useContext, useEffect, useState } from 'react';

const ReviewsContext = createContext();
export const useReviews = () => useContext(ReviewsContext);

const STORAGE_KEY = 'amir_reviews';
const VOTES_KEY   = 'amir_review_votes'; // 👈 who voted helpful, per browser

export function ReviewsProvider({ children }) {
  /* ─── Reviews ─── */
  const [reviews, setReviews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  });

  /* ─── Votes: { [reviewId]: 'up' | 'down' } — per browser ─── */
  const [votes, setVotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(VOTES_KEY)) || {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  }, [votes]);

  /* ═══════════════ ADD REVIEW ═══════════════ */
  const addReview = ({ productId, rating, title, comment, image, user }) => {
    const review = {
      id: `RV-${Date.now().toString().slice(-6)}`,
      productId,
      rating: Number(rating),
      title: (title || '').trim(),
      comment: (comment || '').trim(),
      image: (image || '').trim(),
      // Snapshot of the reviewer for display
      authorName:  user?.name  || 'Guest',
      authorEmail: user?.email || null,
      authorRole:  user?.role  || 'guest',
      verified:    !!user, // simple rule: logged-in = verified
      helpful:     0,
      notHelpful:  0,
      status:      'published', // 'published' | 'hidden'
      createdAt:   new Date().toISOString(),
      replies:     [], // staff replies
    };
    setReviews(prev => [review, ...prev]);
    return review;
  };

  /* ═══════════════ DELETE ═══════════════ */
  const deleteReview = (id) => {
    setReviews(prev => prev.filter(r => r.id !== id));
    // also clear any vote for that review
    setVotes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  /* ═══════════════ HIDE / PUBLISH (moderation) ═══════════════ */
  const setReviewStatus = (id, status) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  /* ═══════════════ VOTE HELPFUL / NOT ═══════════════ */
  // type: 'up' | 'down'
  const voteReview = (id, type) => {
    const current = votes[id];

    // if voting the same way → undo
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

    // switching vote (e.g., was 'up' now 'down') — remove old, add new
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

  /* ═══════════════ QUERIES ═══════════════ */
  const getByProduct = (productId) =>
    reviews
      .filter(r => r.productId === productId && r.status === 'published')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getAllByProduct = (productId) =>
    reviews
      .filter(r => r.productId === productId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Average rating + count (only published)
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
      avg: Math.round((sum / list.length) * 10) / 10, // e.g. 4.5
      count: list.length,
      breakdown,
    };
  };

  // Has the current user already reviewed this product?
  const hasReviewed = (productId, email) => {
    if (!email) return false;
    return reviews.some(
      r => r.productId === productId && r.authorEmail === email.toLowerCase()
    );
  };

  /* ═══════════════ STAFF STATS ═══════════════ */
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