'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.runtime.info('Service Worker registered', registration.scope);
          
          // 检查更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 新版本可用，可以提示用户刷新
                  logger.runtime.info('New service worker version available');
                }
              });
            }
          });
        })
        .catch((error) => {
          logger.runtime.warn('Service Worker registration failed', error);
        });

      // 监听来自 Service Worker 的消息
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICK') {
          // 处理通知点击
          logger.runtime.info('Notification clicked', event.data.data);
        }
      });
    }
  }, []);

  return null;
}
