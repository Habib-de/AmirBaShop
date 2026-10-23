/* ═══════════════════════════════════════════════════════════
   PUSH SERVICE — browser-side push subscription helpers
   ═══════════════════════════════════════════════════════════ */

import { apiRequest } from './api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/* ─── Convert base64url VAPID key to Uint8Array (required by subscribe) ─── */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/* ─── Is push supported by this browser? ─── */
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/* ─── Current permission state: 'default' | 'granted' | 'denied' ─── */
export function getPermission() {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/* ─── Is the current browser already subscribed? ─── */
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/* ─── Request permission and subscribe ─── */
export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Missing VAPID public key — check .env');
  }

  // 1. Request permission (must be triggered by user gesture)
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications blocked. Enable them in browser settings.'
        : 'Notification permission not granted'
    );
  }

  // 2. Get or create a subscription
  const reg = await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // 3. POST the subscription to the backend
  const payload = sub.toJSON(); // { endpoint, expirationTime, keys: { p256dh, auth } }
  await apiRequest('/push/subscribe', {
    method: 'POST',
    auth: true,
    body: {
      endpoint: payload.endpoint,
      keys: {
        p256dh: payload.keys?.p256dh,
        auth: payload.keys?.auth,
      },
    },
  });

  return sub;
}

/* ─── Unsubscribe from push ─── */
export async function disablePushNotifications() {
  if (!isPushSupported()) return;
  const sub = await getExistingSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  try { await sub.unsubscribe(); } catch {}
  try {
    await apiRequest(`/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
      auth: true,
    });
  } catch (err) {
    console.warn('[Push] Unsubscribe backend call failed:', err.message);
  }
}