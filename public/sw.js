const CACHE_NAME = 'web3chat-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New message received',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'web3chat-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Chat'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Web3 Chat', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});