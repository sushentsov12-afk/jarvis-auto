// public/service-worker.js

const CACHE_NAME = 'jarvis-auto-v1';
const RUNTIME_CACHE = 'jarvis-auto-runtime-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

const RUNTIME_ENDPOINTS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com',
];

/* ── INSTALLATION ────────────────────────────────────────────────── */

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Пропустить ожидание и активироваться сразу
  self.skipWaiting();
});

/* ── ACTIVATION ──────────────────────────────────────────────────── */

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map((cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );

  // Забрать контроль над всеми страницами
  self.clients.claim();
});

/* ── FETCH STRATEGY ──────────────────────────────────────────────── */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Статические ресурсы — кэш в первую очередь
  if (STATIC_ASSETS.includes(url.pathname) || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((response) => {
          // Не кэшируй ошибки
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Клонируй ответ (можно использовать только один раз)
          const clonedResponse = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });

          return response;
        });
      })
    );

    return;
  }

  // 2. Google Fonts, CDN — кэш, но с сетевым резервом
  if (RUNTIME_ENDPOINTS.some((ep) => url.href.startsWith(ep))) {
    event.respondWith(
      caches.match(request).then((response) => {
        return (
          response ||
          fetch(request).then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }

            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });

            return response;
          })
        );
      })
    );

    return;
  }

  // 3. API запросы (Firebase, Claude Functions) — сеть в первую очередь
  if (request.method === 'POST' || url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Кэшируй успешные ответы для оффлайна
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Если нет сети, попробуй кэш
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // Если нет кэша, вернуть оффлайн fallback
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'Вы находитесь в режиме оффлайн. Пожалуйста, проверьте интернет-соединение.',
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );

    return;
  }

  // 4. Все остальное — сеть с кэш-резервом
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const clonedResponse = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, clonedResponse);
        });

        return response;
      })
      .catch(() => caches.match(request))
  );
});

/* ── BACKGROUND SYNC (для синхронизации данных при восстановлении сети) ──── */

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-diagnostics') {
    console.log('[ServiceWorker] Syncing diagnostics...');

    event.waitUntil(
      // Получи список несинхронизированных диагнозов из IndexedDB
      // и отправь их на сервер
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_DIAGNOSTICS',
            status: 'syncing',
          });
        });
      })
    );
  }
});

/* ── PUSH NOTIFICATIONS (для уведомлений о ТО) ───────────────────── */

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[ServiceWorker] Push received but no data');
    return;
  }

  const options = event.data.json();

  const notificationPromise = self.registration.showNotification(options.title || 'Jarvis Auto', {
    icon: '/icons/favicon-192.png',
    badge: '/icons/favicon-192.png',
    body: options.body,
    tag: options.tag,
    requireInteraction: options.requireInteraction || false,
    data: options.data,
  });

  event.waitUntil(notificationPromise);
});

/* ── NOTIFICATION CLICK ──────────────────────────────────────────── */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если окно уже открыто — переключись на него
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }

      // Если окна нет — открой новое
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

/* ── MESSAGE HANDLING (для коммуникации между приложением и SW) ──── */

self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Skipping waiting and claiming clients');
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    console.log('[ServiceWorker] Clearing caches');
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});
