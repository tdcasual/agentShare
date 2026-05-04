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


          const handleUpdateFound = () => {
            const newWorker = registration.installing;
            if (newWorker) {
              const handleStateChange = () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {

                  logger.runtime.info('New service worker version available');
                }
              };
              newWorker.addEventListener('statechange', handleStateChange);
            }
          };

          registration.addEventListener('updatefound', handleUpdateFound);


          return () => {
            registration.removeEventListener('updatefound', handleUpdateFound);
          };
        })
        .catch((error) => {
          logger.runtime.warn('Service Worker registration failed', error);
        });


      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_CLICK') {

          logger.runtime.info('Notification clicked', event.data.data);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);


      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);


      };
    }
    return undefined;
  }, []);

  return null;
}
