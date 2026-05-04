'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface PWAState {

  isInstallable: boolean;
  isInstalled: boolean;
  installPrompt: BeforeInstallPromptEvent | null;

  hasUpdate: boolean;
  updateWorker: ServiceWorker | null;

  isOffline: boolean;

  canShare: boolean;
  canVibrate: boolean;

  install: () => Promise<void>;
  update: () => Promise<void>;
  dismissUpdate: () => void;
}


declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

export function usePWA(): PWAState {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [canShare] = useState(() => 'share' in navigator);
  const [canVibrate] = useState(() => 'vibrate' in navigator);


  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {

      e.preventDefault();

      setInstallPrompt(e);
      setIsInstallable(true);
      logger.pwa.info('App is installable');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      logger.pwa.info('App was installed');
    };

  
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        ((window.navigator as unknown as { standalone?: boolean }).standalone ?? false) === true;
      setIsInstalled(isStandalone);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    checkInstalled();

  
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);


  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      logger.pwa.info('App is online');
    };

    const handleOffline = () => {
      setIsOffline(true);
      logger.pwa.info('App is offline');
    };

  
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleControllerChange = () => {
      logger.pwa.info('Service worker controller changed');
      window.location.reload();
    };

    let registration: ServiceWorkerRegistration | null = null;
    const stateChangeHandlers = new Map<ServiceWorker, EventListener>();

    const handleUpdateFound = () => {
      if (!registration) {
        return;
      }
      const newWorker = registration.installing;
      if (!newWorker) {
        return;
      }

      const onStateChange = () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          setHasUpdate(true);
          setUpdateWorker(newWorker);
          logger.pwa.info('New app version available');
        }
      };
      newWorker.addEventListener('statechange', onStateChange);
      stateChangeHandlers.set(newWorker, onStateChange);
    };

    const setup = async () => {
      registration = await navigator.serviceWorker.ready;
      registration.addEventListener('updatefound', handleUpdateFound);
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

  
      const checkForUpdates = () => {
        registration!.update().catch((error) => {
          logger.pwa.warn('Failed to check for updates', error);
        });
      };
      checkForUpdates();
      const interval = setInterval(checkForUpdates, 60 * 60 * 1000);

  
      if (registration.installing) {
        handleUpdateFound();
      }

      return () => {
        registration?.removeEventListener('updatefound', handleUpdateFound);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        clearInterval(interval);
        stateChangeHandlers.forEach((handler, worker) => {
          worker.removeEventListener('statechange', handler);
        });
        stateChangeHandlers.clear();
      };
    };

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    setup()
      .then((cleanupFn) => {
        if (!cancelled) {
          cleanup = cleanupFn;
        } else {

          cleanupFn?.();
        }
      })
      .catch((error) => {
        logger.pwa.error('Failed to setup service worker update listener', error);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);


  const install = useCallback(async () => {
    if (!installPrompt) {
      logger.pwa.warn('Install prompt not available');
      return;
    }

    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;

      if (result.outcome === 'accepted') {
        logger.pwa.info('User accepted install');
      } else {
        logger.pwa.info('User dismissed install');
      }
    } catch (error) {
      logger.pwa.error('Install failed', error);
    } finally {
      setInstallPrompt(null);
      setIsInstallable(false);
    }
  }, [installPrompt]);


  const update = useCallback(async () => {
    if (updateWorker) {

      updateWorker.postMessage({ type: 'SKIP_WAITING' });
      setHasUpdate(false);
    }
  }, [updateWorker]);


  const dismissUpdate = useCallback(() => {
    setHasUpdate(false);
    logger.pwa.info('Update dismissed by user');
  }, []);

  return {
    isInstallable,
    isInstalled,
    installPrompt,
    hasUpdate,
    updateWorker,
    isOffline,
    canShare,
    canVibrate,
    install,
    update,
    dismissUpdate,
  };
}


export async function shareContent(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<void> {
  if ('share' in navigator) {
    try {
      await navigator.share(data);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        logger.pwa.error('Share failed', error);
        throw error;
      }
    }
  } else {
    throw new Error('Web Share API not supported');
  }
}


export function vibrateFeedback(pattern: number | number[] = 50): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
