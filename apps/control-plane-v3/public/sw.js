/**
 * Control Plane V3 - Service Worker
 * 
 * 功能：
 * - 离线缓存支持
 * - 网络优先策略，回退到缓存
 * - 后台同步
 * - 推送通知
 * - 自动更新
 */

const CACHE_NAME = 'control-plane-v3-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/setup',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 网络优先策略，回退到缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过非同源请求（如外部 API）
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // 跳过 API 请求，避免缓存敏感数据或返回过期的认证状态
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 网络优先，回退到缓存
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 缓存成功的响应
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败时回退到缓存
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 如果是页面导航，返回离线页面
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }
          return new Response('网络错误', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // 处理后台同步任务
  console.log('Background sync executed');
}

// 推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: data.tag,
        data: data.data,
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false,
        vibrate: data.vibrate || [200, 100, 200],
      })
    );
  }
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        client.postMessage({
          type: 'NOTIFICATION_CLICK',
          data: event.notification.data
        });
        // 如果有动作数据，导航到指定 URL
        if (event.notification.data?.url) {
          client.navigate(event.notification.data.url);
        }
      } else {
        clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});

// 监听消息（用于跳过等待）
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
