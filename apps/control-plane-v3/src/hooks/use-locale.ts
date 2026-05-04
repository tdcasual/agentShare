'use client';

import { useState, useEffect, useCallback } from 'react';
import { defaultLocale, type Locale } from '@/i18n/config';

const STORAGE_KEY = 'app-locale';

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (saved === 'zh-CN' || saved === 'en')) {
        setLocaleState(saved);
      }
    } catch {
      // ignore localStorage errors (SSR, private mode, disabled)
    }
    setIsReady(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore localStorage errors
    }
    window.location.reload();
  }, []);

  return { locale, setLocale, isReady };
}
