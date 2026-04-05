'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.runtime.info('Service Worker registered', registration.scope);
          
          // 检查更新
          const handleUpdateFound = () => {
            const newWorker = registration.installing;
            if (newWorker) {
              const handleStateChange = () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 新版本可用，可以提示用户刷新
                  logger.runtime.info('New service worker version available');
                }
              };
              newWorker.addEventListener('statechange', handleStateChange);
            }
          };
          
          registration.addEventListener('updatefound', handleUpdateFound);
          
          // 返回清理函数
          return () => {
            registration.removeEventListener('updatefound', handleUpdateFound);
          };
        })
        .catch((error) => {
          logger.runtime.warn('Service Worker registration failed', error);
        });

      // 监听来自 Service Worker 的消息
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_CLICK') {
          // 处理通知点击
          logger.runtime.info('Notification clicked', event.data.data);
        }
      };
      
      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      // 清理函数
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        // 注意：Service Worker 注册本身不会被清理，这是预期的行为
        // 但我们会清理事件监听器
      };
    }
    return undefined;
  }, []);

  return null;
}
