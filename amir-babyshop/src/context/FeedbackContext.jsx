import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { feedbackService } from '../services/api';
import { useAuth } from './AuthContext';

const FeedbackContext = createContext();
export const useFeedback = () => useContext(FeedbackContext);

export function FeedbackProvider({ children }) {
  const { user, isStaff } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (isStaff) {
        // Staff sees ALL messages for the shop
        const list = await feedbackService.listAll();
        setMessages(list);
      } else if (user?.email) {
        // Logged-in customers see THEIR messages
        const list = await feedbackService.listMine(user.email);
        setMessages(list);
      } else {
        // Guests don't fetch from backend (they use localStorage IDs)
        setMessages([]);
      }
    } catch (err) {
      console.warn('[Feedback] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [isStaff, user?.id, user?.email]);

  useEffect(() => { reload(); }, [reload]);

  const sendMessage = async ({ name, email, subject, message, sentBy }) => {
    try {
      const entry = await feedbackService.create({ name, email, subject, message, sentBy });
      setMessages(prev => [entry, ...prev]);
      return { ok: true, entry };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

    const addReply = async (id, { text, author, role }) => {
    try {
      const updated = await feedbackService.reply(id, { text, author, role });
      setMessages(prev => prev.map(m => m.id === id ? updated : m));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const markRead = async (id) => {
    const updated = await feedbackService.updateStatus(id, 'read');
    setMessages(prev => prev.map(m => m.id === id ? updated : m));
  };

  const markResolved = async (id) => {
    const updated = await feedbackService.updateStatus(id, 'resolved');
    setMessages(prev => prev.map(m => m.id === id ? updated : m));
  };

  const deleteMessage = async (id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const findByEmail = (email) => {
    if (!email) return [];
    return messages.filter(m => m.email?.toLowerCase() === email.toLowerCase());
  };

  const counts = {
    total:    messages.length,
    unread:   messages.filter(m => m.status === 'unread').length,
    read:     messages.filter(m => m.status === 'read').length,
    resolved: messages.filter(m => m.status === 'resolved').length,
  };

  return (
    <FeedbackContext.Provider value={{
      messages,
      loading,
      reload,
      sendMessage,
      addReply,
      markRead,
      markResolved,
      deleteMessage,
      findByEmail,
      counts,
    }}>
      {children}
    </FeedbackContext.Provider>
  );
}