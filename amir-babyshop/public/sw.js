/* ═══════════════════════════════════════════════════════════
   AMIR BabyShop — Service Worker
   Receives push events, shows notifications, handles clicks.
   ═══════════════════════════════════════════════════════════ */

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* ─── Push received from the server ─── */
self.addEventListener('push', (event) => {
  let data = { title: 'AMIR BabyShop', body: 'You have a new notification', url: '/' };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        url: parsed.url || '/',
        tag: parsed.tag || undefined,
        icon: parsed.icon || '/icon.png',
        badge: parsed.badge || '/icon.png',
      };
    } catch {
      // Not JSON — treat as plain text body
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: { url: data.url },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/* ─── User tapped a notification ─── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // If a tab is already open at this URL, focus it
      for (const client of allClients) {
        if (client.url === fullUrl && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })()
  );
});