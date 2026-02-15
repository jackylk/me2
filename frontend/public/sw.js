// Me2 Service Worker
const CACHE_NAME = 'me2-v1';
const RUNTIME_CACHE = 'me2-runtime';

// 静态资源缓存列表
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );

  // 立即激活新的 service worker
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

// Fetch 事件 - 网络优先策略（API），缓存优先策略（静态资源）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过 Chrome extension 请求
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API 请求 - 网络优先，失败时显示离线页面
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // 静态资源 - 缓存优先，缓存未命中时从网络获取
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // 只缓存成功的 GET 请求
        if (
          !response ||
          response.status !== 200 ||
          response.type !== 'basic' ||
          request.method !== 'GET'
        ) {
          return response;
        }

        // 克隆响应以便缓存
        const responseToCache = response.clone();

        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    }).catch(() => {
      // 网络和缓存都失败，返回离线页面
      return caches.match('/offline.html');
    })
  );
});

// 推送通知事件（未来功能）
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Me2';
  const options = {
    body: data.body || '你有新消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 点击通知事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
