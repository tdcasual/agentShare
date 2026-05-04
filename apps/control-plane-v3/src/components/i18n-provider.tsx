'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import zhCN from '@/i18n/messages/zh-CN.json';
import en from '@/i18n/messages/en.json';

const messages = { 'zh-CN': zhCN, en };
const LOCALE_STORAGE_KEY = 'app-locale';
const LOCALE_COOKIE_NAME = 'app-locale';

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore localStorage errors
  }

  try {
    window.document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // ignore cookie write errors
  }
}

function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

function readCookieLocale(): Locale | null {
  try {
    const cookieMatch = window.document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`));
    const cookieLocale = cookieMatch?.split('=').slice(1).join('=');
    return isLocale(cookieLocale) ? cookieLocale : null;
  } catch {
    return null;
  }
}

function readStoredLocale(): Locale | null {
  try {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(storedLocale) ? storedLocale : null;
  } catch {
    return null;
  }
}

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

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [hasResolvedLocalePreference, setHasResolvedLocalePreference] = useState(false);

  useLayoutEffect(() => {
    const nextLocale = resolveClientLocalePreference(
      initialLocale,
      readCookieLocale(),
      readStoredLocale()
    );

    if (nextLocale !== initialLocale) {
      setLocaleState(nextLocale);
    }

    setHasResolvedLocalePreference(true);
  }, [initialLocale]);

  useEffect(() => {
    if (!hasResolvedLocalePreference) {
      return;
    }
    persistLocale(locale);
  }, [hasResolvedLocalePreference, locale]);

  useEffect(() => {
    if (!hasResolvedLocalePreference) {
      return;
    }
    window.document.documentElement.lang = locale;
  }, [hasResolvedLocalePreference, locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
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

export function resolveClientLocalePreference(
  initialLocale: Locale,
  cookieLocale: string | null | undefined,
  storedLocale: string | null | undefined
): Locale {
  if (!isLocale(cookieLocale) && isLocale(storedLocale) && storedLocale !== initialLocale) {
    return storedLocale;
  }

  return initialLocale;
}
