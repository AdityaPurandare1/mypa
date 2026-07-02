// myPA service worker — workbox precache + Web Push handlers.
//
// P1 uses this only for the PWA precache (offline shell). The push +
// notificationclick handlers below are P2 scaffolding: they work if a server
// ever sends push (see supabase/functions/send-reminders), but nothing wires
// them up in P1 (reminders are in-app, Notification API while the tab is open).

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Take over immediately on install — without this a new deploy sits "waiting"
// until the PWA is fully closed on every device (on iOS, effectively forever),
// so users keep seeing the previous version.
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const SCOPE = self.registration.scope; // ends with '/', e.g. https://host/mypa/

// ─── push (P2) ──────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = { title: 'myPA', body: '', url: SCOPE };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    console.warn('push payload not json', e);
  }

  // Force same-origin. Defend in depth so a leaked payload can't open
  // attacker pages.
  let targetUrl = SCOPE;
  try {
    const t = new URL(payload.url ?? SCOPE, SCOPE);
    if (t.origin === self.location.origin) targetUrl = t.href;
  } catch {
    /* fall back to SCOPE */
  }

  const opts = {
    body: payload.body || ' ', // iOS Safari drops empty-body notifications
    icon: `${SCOPE}pwa-192.png`,
    badge: `${SCOPE}pwa-192.png`,
    data: { url: targetUrl },
    tag: payload.tag || 'mypa',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'myPA', opts));
});

// ─── notificationclick (P2): focus existing tab first ────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? SCOPE;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const exact = wins.find((w) => w.url === targetUrl);
      if (exact?.focus) return exact.focus();
      const sameScope = wins.find((w) => w.url.startsWith(SCOPE));
      if (sameScope?.focus) return sameScope.focus();
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return null;
    })(),
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
