import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

/* 📱 Register Service Worker for push notifications */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => console.log('[SW] Registered:', reg.scope))
      .catch((err) => console.warn('[SW] Registration failed:', err.message));
  });
}

createRoot(document.getElementById('root')).render(
  <App />
);