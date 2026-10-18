import { createContext, useContext, useEffect, useState } from 'react';

const FeedbackContext = createContext();
export const useFeedback = () => useContext(FeedbackContext);

const STORAGE_KEY = 'amir_feedback';

export function FeedbackProvider({ children }) {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = ({ name, email, subject, message, sentBy }) => {
    const entry = {
      id: `FB-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      name: (name || '').trim(),
      email: (email || '').trim().toLowerCase(),
      subject: (subject || 'General').trim(),
      message: (message || '').trim(),
      sentBy: sentBy || 'guest',
      status: 'unread',
      replies: [],
    };
    setMessages(prev => [entry, ...prev]);
    return entry;
  };

  // ── Staff reply saved into the thread ──
  const addReply = (id, { text, author, role }) => {
    const reply = {
      id: `R-${Date.now().toString().slice(-6)}`,
      text: (text || '').trim(),
      author: author || 'Staff',
      role: role || 'sales',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => prev.map(m =>
      m.id === id
        ? {
            ...m,
            replies: [...(m.replies || []), reply],
            status: m.status === 'unread' ? 'read' : m.status,
            updatedAt: new Date().toISOString(),
          }
        : m
    ));
    return reply;
  };

  // ── Find messages by email ──
  const findByEmail = (email) => {
    if (!email) return [];
    const target = email.trim().toLowerCase();
    return messages.filter(m => m.email?.toLowerCase() === target);
  };

  // ── Find one message by its ID ──
  const findById = (id) => {
    if (!id) return null;
    const target = id.trim().toLowerCase();
    return messages.find(m => m.id.toLowerCase() === target) || null;
  };

  const markRead = (id) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'read' } : m));

  const markResolved = (id) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'resolved' } : m));

  const deleteMessage = (id) =>
    setMessages(prev => prev.filter(m => m.id !== id));

  const clearAll = () => setMessages([]);

  const counts = {
    total:    messages.length,
    unread:   messages.filter(m => m.status === 'unread').length,
    read:     messages.filter(m => m.status === 'read').length,
    resolved: messages.filter(m => m.status === 'resolved').length,
  };

  return (
    <FeedbackContext.Provider value={{
      messages,
      sendMessage,
      addReply,
      findByEmail,
      findById,
      markRead,
      markResolved,
      deleteMessage,
      clearAll,
      counts,
    }}>
      {children}
    </FeedbackContext.Provider>
  );
}