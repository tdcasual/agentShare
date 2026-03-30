'use client';

import { useState, useEffect, useCallback } from 'react';
import { defaultLocale, type Locale } from '@/i18n/config';

const STORAGE_KEY = 'app-locale';

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 从 localStorage 读取保存的语言
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (saved === 'zh-CN' || saved === 'en')) {
      setLocaleState(saved);
    }
    setIsReady(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // 刷新页面以应用新语言
    window.location.reload();
  }, []);

  return { locale, setLocale, isReady };
}
