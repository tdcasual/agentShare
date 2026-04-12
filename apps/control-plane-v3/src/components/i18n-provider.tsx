'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { defaultLocale, type Locale } from '@/i18n/config';
import zhCN from '@/i18n/messages/zh-CN.json';
import en from '@/i18n/messages/en.json';

const messages = { 'zh-CN': zhCN, en };

interface I18nContextType {
  locale: Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: defaultLocale,
  t: (key) => key,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app-locale') as Locale | null;
      if (saved && (saved === 'zh-CN' || saved === 'en')) {
        setLocaleState(saved);
      }
    } catch {
      // ignore localStorage errors (SSR, private mode, disabled)
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('app-locale', newLocale);
    } catch {
      // ignore localStorage errors
    }
    window.location.reload();
  }, []);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: unknown = messages[locale];
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }
      let text = typeof value === 'string' ? value : key;
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    },
    [locale]
  );

  // Always provide the context value, even during SSR
  const value = React.useMemo(
    () => ({
      locale,
      t,
      setLocale,
    }),
    [locale, t, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
